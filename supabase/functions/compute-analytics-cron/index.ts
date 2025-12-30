import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify secret header for security
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("x-cron-secret");
  
  if (!cronSecret || authHeader !== cronSecret) {
    console.error("[compute-analytics-cron] Unauthorized: invalid or missing x-cron-secret header");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();
  console.log("[compute-analytics-cron] Starting nightly analytics computation");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Create log entry at start
  const { data: logEntry, error: logInsertError } = await supabase
    .from("cron_logs")
    .insert({
      job_name: "compute-analytics-cron",
      status: "running",
      details: { message: "Starting nightly analytics computation" }
    })
    .select("id")
    .single();

  if (logInsertError) {
    console.error("[compute-analytics-cron] Failed to create log entry:", logInsertError);
  }

  const logId = logEntry?.id;

  try {
    // Get all active sites with operations in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

    // Get unique site_id + user_id combinations from recent operations
    const { data: activeSites, error: sitesError } = await supabase
      .from("operations")
      .select("site_id, user_id")
      .gte("operation_date", dateStr);

    if (sitesError) {
      console.error("[compute-analytics-cron] Error fetching active sites:", sitesError);
      
      // Update log with error
      if (logId) {
        await supabase
          .from("cron_logs")
          .update({
            status: "error",
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            error_message: sitesError.message,
            details: { error: sitesError }
          })
          .eq("id", logId);
      }
      
      return new Response(
        JSON.stringify({ error: sitesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate site_id + user_id combinations
    const uniqueSites = new Map<string, { site_id: string; user_id: string }>();
    (activeSites || []).forEach((op: any) => {
      const key = `${op.site_id}:${op.user_id}`;
      if (!uniqueSites.has(key)) {
        uniqueSites.set(key, { site_id: op.site_id, user_id: op.user_id });
      }
    });

    console.log(`[compute-analytics-cron] Found ${uniqueSites.size} active sites to process`);

    let successCount = 0;
    let errorCount = 0;
    const siteResults: Array<{ site_id: string; status: string; operations?: number; error?: string }> = [];

    // Process each site
    for (const [key, { site_id, user_id }] of uniqueSites) {
      try {
        // Call the compute-analytics function for this site
        const response = await fetch(`${supabaseUrl}/functions/v1/compute-analytics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            site_id,
            user_id,
            // Compute last 90 days of data
            start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            end_date: new Date().toISOString().split("T")[0],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[compute-analytics-cron] Site ${site_id}: ${result.operations_processed || 0} operations processed`);
          siteResults.push({
            site_id,
            status: "success",
            operations: result.operations_processed || 0
          });
          successCount++;
        } else {
          const errorText = await response.text();
          console.error(`[compute-analytics-cron] Site ${site_id} failed:`, errorText);
          siteResults.push({
            site_id,
            status: "error",
            error: errorText.substring(0, 200) // Limit error message length
          });
          errorCount++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`[compute-analytics-cron] Site ${site_id} error:`, errorMessage);
        siteResults.push({
          site_id,
          status: "error",
          error: errorMessage
        });
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[compute-analytics-cron] Completed: ${successCount} success, ${errorCount} errors, ${duration}ms`);

    // Update log entry with results
    if (logId) {
      await supabase
        .from("cron_logs")
        .update({
          status: errorCount > 0 ? "partial" : "success",
          completed_at: new Date().toISOString(),
          sites_processed: successCount,
          sites_failed: errorCount,
          duration_ms: duration,
          details: {
            total_sites: uniqueSites.size,
            site_results: siteResults.slice(0, 50) // Limit to first 50 for storage
          }
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sites_processed: successCount,
        sites_failed: errorCount,
        duration_ms: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[compute-analytics-cron] Unexpected error:", errorMessage);
    
    // Update log entry with error
    if (logId) {
      await supabase
        .from("cron_logs")
        .update({
          status: "error",
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          error_message: errorMessage,
          details: { unexpected_error: errorMessage }
        })
        .eq("id", logId);
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
