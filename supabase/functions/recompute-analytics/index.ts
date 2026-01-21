/**
 * Recompute Analytics Edge Function - TAEX-202
 * 
 * Platform admin tool to safely recompute analytics for a site within a date range.
 * Does NOT touch raw operations, only recomputes derived analytics tables.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkFeatureOrBlock } from "../_shared/feature-flags.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RANGE_DAYS = 90;

interface OperationRow {
  id: string;
  site_id: string;
  user_id: string;
  operation_date: string;
  operation_time: string | null;
  amount: number;
  payment_mode: string | null;
  machine: string | null;
}

interface DailyStats {
  revenue: number;
  transactions: number;
  revenue_card: number;
  revenue_cash: number;
  machines: Set<string>;
  hourly: Record<number, { revenue: number; transactions: number }>;
}

interface RecomputeRequest {
  site_id: string;
  date_from: string;
  date_to: string;
  force_bypass?: boolean; // Super admin only: bypass 90-day limit
}

// Calculate days between two dates
function daysBetween(from: string, to: string): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Validate date format (YYYY-MM-DD)
function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // TAEX-223: Check feature flag
  const flagCheck = await checkFeatureOrBlock(supabase, 'recompute_analytics_enabled', 'Recompute Analytics');
  if (!flagCheck.allowed) {
    return flagCheck.response;
  }

  // Get actor info from auth header
  const authHeader = req.headers.get("authorization");
  let actorId: string | null = null;
  let actorEmail: string | null = null;

  try {
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        actorId = user.id;
        actorEmail = user.email || null;
      }
    }

    // Verify platform admin role
    if (!actorId) {
      console.error("[recompute-analytics] No authenticated user");
      await logEvent(supabase, 'warn', 'RECOMPUTE_UNAUTHORIZED', 'Unauthenticated recompute attempt', {});
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is platform admin or super admin
    const [adminCheck, superAdminCheck] = await Promise.all([
      supabase.rpc('is_platform_admin', { uid: actorId }),
      supabase.rpc('is_platform_super_admin', { uid: actorId }),
    ]);

    const isAdmin = adminCheck.data === true;
    const isSuperAdmin = superAdminCheck.data === true;

    if (!isAdmin && !isSuperAdmin) {
      console.error("[recompute-analytics] User is not platform admin:", actorId);
      await logEvent(supabase, 'error', 'RECOMPUTE_UNAUTHORIZED', 'Non-admin recompute attempt', {
        actor_id: actorId,
        actor_email: actorEmail,
      });
      return new Response(
        JSON.stringify({ error: "Platform admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { site_id, date_from, date_to, force_bypass }: RecomputeRequest = await req.json();

    // Validate required fields
    if (!site_id || !date_from || !date_to) {
      return new Response(
        JSON.stringify({ error: "site_id, date_from, and date_to are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate date formats
    if (!isValidDate(date_from) || !isValidDate(date_to)) {
      return new Response(
        JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate date range
    if (date_from > date_to) {
      return new Response(
        JSON.stringify({ error: "date_from must be before or equal to date_to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max range (90 days) - can be bypassed by super admin with force_bypass flag
    const rangeDays = daysBetween(date_from, date_to);
    if (rangeDays > MAX_RANGE_DAYS) {
      if (!force_bypass) {
        return new Response(
          JSON.stringify({ 
            error: `Date range exceeds maximum of ${MAX_RANGE_DAYS} days. Requested: ${rangeDays} days`,
            max_days: MAX_RANGE_DAYS,
            requested_days: rangeDays,
            can_force_bypass: isSuperAdmin,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // force_bypass requested - verify super admin
      if (!isSuperAdmin) {
        console.error("[recompute-analytics] Force bypass requested by non-super-admin:", actorId);
        await logEvent(supabase, 'error', 'RECOMPUTE_BYPASS_DENIED', 'Non-super-admin attempted force bypass', {
          actor_id: actorId,
          actor_email: actorEmail,
          requested_days: rangeDays,
        });
        return new Response(
          JSON.stringify({ error: "Force bypass requires super_admin privileges" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`[recompute-analytics] Force bypass enabled by super admin for ${rangeDays} days`);
      await logEvent(supabase, 'warn', 'RECOMPUTE_FORCE_BYPASS', `Super admin bypassing ${MAX_RANGE_DAYS}-day limit`, {
        actor_id: actorId,
        actor_email: actorEmail,
        requested_days: rangeDays,
        site_id,
      });
    }

    // Fetch site info
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, name, user_id")
      .eq("id", site_id)
      .single();

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: "Site not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[recompute-analytics] Starting for site ${site.name} (${site_id}), range: ${date_from} to ${date_to}`);

    // Fetch operations for the site within date range
    const { data: operations, error: fetchError } = await supabase
      .from("operations")
      .select("id, site_id, user_id, operation_date, operation_time, amount, payment_mode, machine")
      .eq("site_id", site_id)
      .gte("operation_date", date_from)
      .lte("operation_date", date_to);

    if (fetchError) {
      console.error("[recompute-analytics] Error fetching operations:", fetchError);
      await logEvent(supabase, 'error', 'RECOMPUTE_FETCH_FAIL', 'Failed to fetch operations', {
        site_id,
        site_name: site.name,
        date_from,
        date_to,
        error: fetchError.message,
        actor_id: actorId,
        actor_email: actorEmail,
      });
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const operationCount = operations?.length || 0;
    console.log(`[recompute-analytics] Found ${operationCount} operations to process`);

    // If no operations, still need to clear any existing analytics for the range
    // (in case operations were deleted)

    // Group operations by date
    const dailyMap = new Map<string, DailyStats>();

    for (const op of (operations || []) as OperationRow[]) {
      const date = op.operation_date;
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          revenue: 0,
          transactions: 0,
          revenue_card: 0,
          revenue_cash: 0,
          machines: new Set(),
          hourly: {},
        });
      }

      const stats = dailyMap.get(date)!;
      const amount = Number(op.amount) || 0;
      
      stats.revenue += amount;
      stats.transactions += 1;

      // Payment mode classification
      const mode = (op.payment_mode || "").toLowerCase();
      if (mode.includes("cb") || mode.includes("card") || mode.includes("carte")) {
        stats.revenue_card += amount;
      } else {
        stats.revenue_cash += amount;
      }

      // Machine tracking
      if (op.machine) {
        stats.machines.add(op.machine);
      }

      // Hourly breakdown
      if (op.operation_time) {
        const hour = parseInt(op.operation_time.split(":")[0], 10);
        if (!isNaN(hour)) {
          if (!stats.hourly[hour]) {
            stats.hourly[hour] = { revenue: 0, transactions: 0 };
          }
          stats.hourly[hour].revenue += amount;
          stats.hourly[hour].transactions += 1;
        }
      }
    }

    // First, delete existing analytics_daily records for this site/date range
    // This ensures idempotent behavior (no duplicates)
    const { error: deleteError } = await supabase
      .from("analytics_daily")
      .delete()
      .eq("site_id", site_id)
      .gte("date", date_from)
      .lte("date", date_to);

    if (deleteError) {
      console.error("[recompute-analytics] Error deleting old daily records:", deleteError);
    }

    // Prepare and insert new analytics_daily records
    const dailyRecords = Array.from(dailyMap.entries()).map(([date, stats]) => {
      const hourlyArray = Object.entries(stats.hourly).map(([hour, data]) => ({
        hour: parseInt(hour, 10),
        revenue: data.revenue,
        transactions: data.transactions,
      }));

      return {
        site_id,
        user_id: site.user_id,
        date,
        revenue: stats.revenue,
        transactions: stats.transactions,
        revenue_card: stats.revenue_card,
        revenue_cash: stats.revenue_cash,
        average_basket: stats.transactions > 0 ? stats.revenue / stats.transactions : 0,
        machine_stats: { unique_count: stats.machines.size, machines: Array.from(stats.machines) },
        hourly_breakdown: hourlyArray,
      };
    });

    let dailyWritten = 0;
    if (dailyRecords.length > 0) {
      const { error: dailyError } = await supabase
        .from("analytics_daily")
        .insert(dailyRecords);

      if (dailyError) {
        console.error("[recompute-analytics] Error inserting daily:", dailyError);
        await logEvent(supabase, 'error', 'RECOMPUTE_DAILY_FAIL', 'Failed to write analytics_daily', {
          site_id,
          site_name: site.name,
          date_from,
          date_to,
          error: dailyError.message,
          actor_id: actorId,
          actor_email: actorEmail,
        });
        return new Response(
          JSON.stringify({ error: dailyError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      dailyWritten = dailyRecords.length;
    }

    // Compute monthly KPIs for affected months
    const monthlyMap = new Map<string, DailyStats>();

    for (const [date, stats] of dailyMap.entries()) {
      const monthKey = date.substring(0, 7); // YYYY-MM
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          revenue: 0,
          transactions: 0,
          revenue_card: 0,
          revenue_cash: 0,
          machines: new Set(),
          hourly: {},
        });
      }

      const monthStats = monthlyMap.get(monthKey)!;
      monthStats.revenue += stats.revenue;
      monthStats.transactions += stats.transactions;
      monthStats.revenue_card += stats.revenue_card;
      monthStats.revenue_cash += stats.revenue_cash;
      stats.machines.forEach((m) => monthStats.machines.add(m));

      // Aggregate hourly for peak hour calculation
      for (const [hour, data] of Object.entries(stats.hourly)) {
        const h = parseInt(hour, 10);
        if (!monthStats.hourly[h]) {
          monthStats.hourly[h] = { revenue: 0, transactions: 0 };
        }
        monthStats.hourly[h].revenue += data.revenue;
        monthStats.hourly[h].transactions += data.transactions;
      }
    }

    // For monthly KPIs, we need to recompute the entire month
    // So we need to fetch ALL daily data for affected months
    const affectedMonths = Array.from(monthlyMap.keys());
    
    // Prepare and upsert analytics_kpis records
    const kpiRecords = [];
    
    for (const monthKey of affectedMonths) {
      // Fetch all daily data for this month to compute accurate monthly KPIs
      const [year, month] = monthKey.split("-").map(Number);
      const monthStart = `${monthKey}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

      const { data: monthDailyData } = await supabase
        .from("analytics_daily")
        .select("*")
        .eq("site_id", site_id)
        .gte("date", monthStart)
        .lte("date", monthEnd);

      if (monthDailyData && monthDailyData.length > 0) {
        let totalRevenue = 0;
        let totalTransactions = 0;
        let revenueCard = 0;
        let revenueCash = 0;
        const allMachines = new Set<string>();
        const hourlyAgg: Record<number, number> = {};

        for (const day of monthDailyData) {
          totalRevenue += Number(day.revenue) || 0;
          totalTransactions += Number(day.transactions) || 0;
          revenueCard += Number(day.revenue_card) || 0;
          revenueCash += Number(day.revenue_cash) || 0;
          
          const machineStats = day.machine_stats as { machines?: string[] } | null;
          if (machineStats?.machines) {
            machineStats.machines.forEach((m: string) => allMachines.add(m));
          }

          const hourly = day.hourly_breakdown as Array<{ hour: number; transactions: number }> | null;
          if (hourly) {
            for (const h of hourly) {
              hourlyAgg[h.hour] = (hourlyAgg[h.hour] || 0) + h.transactions;
            }
          }
        }

        // Find peak hour
        let peakHour: number | null = null;
        let maxTransactions = 0;
        for (const [hour, txCount] of Object.entries(hourlyAgg)) {
          if (txCount > maxTransactions) {
            maxTransactions = txCount;
            peakHour = parseInt(hour, 10);
          }
        }

        kpiRecords.push({
          site_id,
          user_id: site.user_id,
          period_type: "monthly",
          period_start: monthStart,
          period_end: monthEnd,
          total_revenue: totalRevenue,
          total_transactions: totalTransactions,
          revenue_card: revenueCard,
          revenue_cash: revenueCash,
          average_basket: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
          unique_machines: allMachines.size,
          peak_hour: peakHour,
        });
      }
    }

    let kpisWritten = 0;
    if (kpiRecords.length > 0) {
      const { error: kpiError } = await supabase
        .from("analytics_kpis")
        .upsert(kpiRecords, { onConflict: "site_id,period_type,period_start" });

      if (kpiError) {
        console.error("[recompute-analytics] Error upserting KPIs:", kpiError);
        // Non-fatal, continue
      } else {
        kpisWritten = kpiRecords.length;
      }
    }

    // Bump analytics version for the site
    await supabase.rpc("bump_analytics_version", { 
      p_site_id: site_id, 
      p_status: "recomputed" 
    });

    const duration = Date.now() - startTime;

    // Log success
    await logEvent(supabase, 'info', 'RECOMPUTE_SUCCESS', `Analytics recomputed for ${site.name}`, {
      site_id,
      site_name: site.name,
      date_from,
      date_to,
      range_days: rangeDays,
      operations_processed: operationCount,
      daily_records_written: dailyWritten,
      kpi_records_written: kpisWritten,
      duration_ms: duration,
      actor_id: actorId,
      actor_email: actorEmail,
    });

    console.log(`[recompute-analytics] Success: ${dailyWritten} daily, ${kpisWritten} monthly records in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        site_name: site.name,
        date_from,
        date_to,
        range_days: rangeDays,
        operations_processed: operationCount,
        daily_records_written: dailyWritten,
        kpi_records_written: kpisWritten,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[recompute-analytics] Unexpected error:", errorMessage);
    
    await logEvent(supabase, 'error', 'RECOMPUTE_ERROR', 'Recompute analytics failed', {
      error: errorMessage,
      actor_id: actorId,
      actor_email: actorEmail,
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to log system events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logEvent(
  supabase: any,
  severity: 'info' | 'warn' | 'error',
  code: string,
  message: string,
  meta: Record<string, unknown>
) {
  try {
    await supabase.rpc("rpc_log_system_event", {
      p_env: "prod",
      p_source: "recompute_analytics",
      p_severity: severity,
      p_code: code,
      p_message: message,
      p_meta: meta,
    });
  } catch (err) {
    console.error("[recompute-analytics] Failed to log event:", err);
  }
}
