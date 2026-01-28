/**
 * log-performance Edge Function
 * 
 * Logs client-side performance events to system_events table
 * Called in batches from the frontend performance monitor
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PerformanceEvent {
  page: string;
  widget: string;
  durationMs: number;
  dateRangeDays: number;
  siteId?: string;
}

// Thresholds (must match client-side)
const SLOW_QUERY_THRESHOLD = 2000;
const CRITICAL_QUERY_THRESHOLD = 5000;

function getSeverity(durationMs: number): string {
  if (durationMs >= CRITICAL_QUERY_THRESHOLD) return "error";
  if (durationMs >= SLOW_QUERY_THRESHOLD) return "warn";
  return "info";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { events } = (await req.json()) as { events: PerformanceEvent[] };

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ success: true, logged: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit batch size
    const limitedEvents = events.slice(0, 50);

    // Insert events into system_events
    const inserts = limitedEvents.map((event) => ({
      source: "perf",
      severity: getSeverity(event.durationMs),
      code: "SLOW_QUERY",
      message: `Slow query: ${event.page}/${event.widget} took ${event.durationMs}ms`,
      meta: {
        page: event.page,
        widget: event.widget,
        duration_ms: event.durationMs,
        date_range_days: event.dateRangeDays,
        site_id: event.siteId || null,
      },
      env: Deno.env.get("ENVIRONMENT") || "prod",
    }));

    const { error } = await supabaseClient
      .from("system_events")
      .insert(inserts);

    if (error) {
      console.error("[log-performance] Insert error:", error);
      // Don't fail - performance logging is best-effort
    }

    return new Response(
      JSON.stringify({ success: true, logged: limitedEvents.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[log-performance] Error:", error);
    
    // Return success anyway - performance logging shouldn't break the app
    return new Response(
      JSON.stringify({ success: true, logged: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
