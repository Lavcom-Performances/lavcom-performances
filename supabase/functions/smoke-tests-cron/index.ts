import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    
    if (!cronSecret || cronSecret !== expectedSecret) {
      console.error("[smoke-tests-cron] Invalid or missing cron secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[smoke-tests-cron] Starting daily smoke tests...");

    // Get all active sites (non-demo, with recent operations)
    const { data: activeSites, error: sitesError } = await supabase
      .from("sites")
      .select("id, name, user_id")
      .eq("is_demo", false);

    if (sitesError) {
      console.error("[smoke-tests-cron] Error fetching sites:", sitesError);
      throw sitesError;
    }

    console.log(`[smoke-tests-cron] Found ${activeSites?.length || 0} active sites`);

    const results: Array<{
      site_id: string;
      site_name: string;
      tests: Array<{ test_key: string; ok: boolean; details: string }>;
      has_failures: boolean;
    }> = [];

    let totalFailures = 0;
    const failedSites: string[] = [];

    // Run smoke tests for each site
    for (const site of activeSites || []) {
      try {
        const { data: testResults, error: testError } = await supabase.rpc(
          "rpc_run_smoke_tests",
          { p_site_id: site.id }
        );

        if (testError) {
          console.error(`[smoke-tests-cron] Error running tests for site ${site.id}:`, testError);
          
          // Log failure
          await supabase.rpc("rpc_log_system_event", {
            p_env: "prod",
            p_source: "smoke-tests-cron",
            p_severity: "error",
            p_code: "SMOKE_TEST_ERROR",
            p_message: `Smoke test error for site ${site.name}`,
            p_meta: { site_id: site.id, error: testError.message },
          });
          
          totalFailures++;
          failedSites.push(site.name);
          continue;
        }

        const hasFailures = testResults?.some((t: { ok: boolean }) => !t.ok) || false;
        
        results.push({
          site_id: site.id,
          site_name: site.name,
          tests: testResults || [],
          has_failures: hasFailures,
        });

        if (hasFailures) {
          totalFailures++;
          failedSites.push(site.name);
          
          const failedTests = testResults?.filter((t: { ok: boolean }) => !t.ok) || [];
          console.warn(`[smoke-tests-cron] Site ${site.name} has ${failedTests.length} failed tests`);
          
          // Log each failure
          for (const test of failedTests) {
            await supabase.rpc("rpc_log_system_event", {
              p_env: "prod",
              p_source: "smoke-tests-cron",
              p_severity: "error",
              p_code: "SMOKE_TEST_FAIL",
              p_message: `Smoke test ${test.test_key} failed for site ${site.name}`,
              p_meta: { site_id: site.id, site_name: site.name, test_key: test.test_key, details: test.details },
            });
          }
        } else {
          console.log(`[smoke-tests-cron] Site ${site.name} passed all tests`);
        }
      } catch (siteError) {
        console.error(`[smoke-tests-cron] Exception for site ${site.id}:`, siteError);
        totalFailures++;
        failedSites.push(site.name);
      }
    }

    // Log summary
    const summary = {
      total_sites: activeSites?.length || 0,
      sites_with_failures: totalFailures,
      failed_sites: failedSites,
      executed_at: new Date().toISOString(),
    };

    if (totalFailures > 0) {
      // Log error summary
      await supabase.rpc("rpc_log_system_event", {
        p_env: "prod",
        p_source: "smoke-tests-cron",
        p_severity: "error",
        p_code: "SMOKE_TEST_SUMMARY",
        p_message: `Daily smoke tests: ${totalFailures} sites with failures`,
        p_meta: summary,
      });

      // Send alert email if configured
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const resendToEmail = Deno.env.get("RESEND_TO_EMAIL");
      const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

      if (resendApiKey && resendToEmail && resendFromEmail) {
        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: resendFromEmail,
              to: [resendToEmail],
              subject: `🚨 Smoke Tests Failed - ${totalFailures} site(s)`,
              html: `
                <h2>Daily Smoke Test Report</h2>
                <p><strong>Status:</strong> ❌ Failures detected</p>
                <p><strong>Sites with failures:</strong> ${totalFailures} / ${activeSites?.length || 0}</p>
                <h3>Failed Sites:</h3>
                <ul>
                  ${failedSites.map((name) => `<li>${name}</li>`).join("")}
                </ul>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                <p>Check /admin/status for details.</p>
              `,
            }),
          });

          if (!emailResponse.ok) {
            console.error("[smoke-tests-cron] Failed to send alert email:", await emailResponse.text());
          } else {
            console.log("[smoke-tests-cron] Alert email sent successfully");
          }
        } catch (emailError) {
          console.error("[smoke-tests-cron] Error sending email:", emailError);
        }
      }
    } else {
      // Log success summary
      await supabase.rpc("rpc_log_system_event", {
        p_env: "prod",
        p_source: "smoke-tests-cron",
        p_severity: "info",
        p_code: "SMOKE_TEST_SUCCESS",
        p_message: `Daily smoke tests: All ${activeSites?.length || 0} sites passed`,
        p_meta: summary,
      });
    }

    console.log("[smoke-tests-cron] Completed:", JSON.stringify(summary));

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[smoke-tests-cron] Fatal error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
