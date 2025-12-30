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

  const startTime = Date.now();
  console.log("[compute-analytics-cron] Starting nightly analytics computation");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          successCount++;
        } else {
          const errorText = await response.text();
          console.error(`[compute-analytics-cron] Site ${site_id} failed:`, errorText);
          errorCount++;
        }
      } catch (err) {
        console.error(`[compute-analytics-cron] Site ${site_id} error:`, err);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[compute-analytics-cron] Completed: ${successCount} success, ${errorCount} errors, ${duration}ms`);

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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
