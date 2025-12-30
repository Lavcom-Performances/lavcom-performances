import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { site_id, user_id, start_date, end_date } = await req.json();

    if (!site_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "site_id and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[compute-analytics] Starting for site ${site_id}, range: ${start_date} - ${end_date}`);

    // Fetch operations for the site
    let query = supabase
      .from("operations")
      .select("id, site_id, user_id, operation_date, operation_time, amount, payment_mode, machine")
      .eq("site_id", site_id)
      .eq("user_id", user_id);

    if (start_date) {
      query = query.gte("operation_date", start_date);
    }
    if (end_date) {
      query = query.lte("operation_date", end_date);
    }

    const { data: operations, error: fetchError } = await query;

    if (fetchError) {
      console.error("[compute-analytics] Error fetching operations:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!operations || operations.length === 0) {
      console.log("[compute-analytics] No operations found");
      return new Response(
        JSON.stringify({ message: "No operations to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[compute-analytics] Processing ${operations.length} operations`);

    // Group operations by date
    const dailyMap = new Map<string, DailyStats>();

    for (const op of operations as OperationRow[]) {
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

    // Prepare analytics_daily records
    const dailyRecords = Array.from(dailyMap.entries()).map(([date, stats]) => {
      const hourlyArray = Object.entries(stats.hourly).map(([hour, data]) => ({
        hour: parseInt(hour, 10),
        revenue: data.revenue,
        transactions: data.transactions,
      }));

      return {
        site_id,
        user_id,
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

    // Upsert analytics_daily
    const { error: dailyError } = await supabase
      .from("analytics_daily")
      .upsert(dailyRecords, { onConflict: "site_id,date" });

    if (dailyError) {
      console.error("[compute-analytics] Error upserting daily:", dailyError);
      return new Response(
        JSON.stringify({ error: dailyError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute monthly KPIs
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

    // Prepare analytics_kpis records (monthly)
    const kpiRecords = Array.from(monthlyMap.entries()).map(([monthKey, stats]) => {
      const [year, month] = monthKey.split("-").map(Number);
      const periodStart = `${monthKey}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const periodEnd = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

      // Find peak hour
      let peakHour: number | null = null;
      let maxTransactions = 0;
      for (const [hour, data] of Object.entries(stats.hourly)) {
        if (data.transactions > maxTransactions) {
          maxTransactions = data.transactions;
          peakHour = parseInt(hour, 10);
        }
      }

      return {
        site_id,
        user_id,
        period_type: "monthly",
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: stats.revenue,
        total_transactions: stats.transactions,
        revenue_card: stats.revenue_card,
        revenue_cash: stats.revenue_cash,
        average_basket: stats.transactions > 0 ? stats.revenue / stats.transactions : 0,
        unique_machines: stats.machines.size,
        peak_hour: peakHour,
      };
    });

    // Upsert analytics_kpis
    const { error: kpiError } = await supabase
      .from("analytics_kpis")
      .upsert(kpiRecords, { onConflict: "site_id,period_type,period_start" });

    if (kpiError) {
      console.error("[compute-analytics] Error upserting KPIs:", kpiError);
      return new Response(
        JSON.stringify({ error: kpiError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[compute-analytics] Success: ${dailyRecords.length} daily, ${kpiRecords.length} monthly records`);

    return new Response(
      JSON.stringify({
        success: true,
        daily_records: dailyRecords.length,
        monthly_records: kpiRecords.length,
        operations_processed: operations.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[compute-analytics] Unexpected error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
