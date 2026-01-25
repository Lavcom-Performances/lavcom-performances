import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkFeatureOrBlock } from "../_shared/feature-flags.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DrillStep {
  name: string;
  passed: boolean;
  details: string;
  duration_ms: number;
}

interface SystemSnapshot {
  timestamp: string;
  sites_count: number;
  demo_sites_count: number;
  analytics_rows_7d: number;
  critical_events_24h: number;
  error_events_24h: number;
}

interface BlockedResponse {
  blocked: true;
  reason: string;
  code: string;
}

// Safety constants
const MAX_CORRUPTION_DAYS = 14;
const COOLDOWN_HOURS = 24;
const RTO_TARGET_MINUTES = 240; // 4 hours

// Screenshot capture helper
// deno-lint-ignore no-explicit-any
async function captureScreenshot(
  supabase: any,
  screenshotUrl: string,
  storagePath: string,
  screenshotApiKey?: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!screenshotApiKey) {
    console.log("SCREENSHOTONE_API_KEY not configured, skipping screenshot");
    return { success: false, error: "Screenshot API key not configured" };
  }

  try {
    // Use ScreenshotOne API
    const apiUrl = new URL("https://api.screenshotone.com/take");
    apiUrl.searchParams.set("access_key", screenshotApiKey);
    apiUrl.searchParams.set("url", screenshotUrl);
    apiUrl.searchParams.set("viewport_width", "1920");
    apiUrl.searchParams.set("viewport_height", "1080");
    apiUrl.searchParams.set("format", "png");
    apiUrl.searchParams.set("full_page", "false");
    apiUrl.searchParams.set("delay", "2");
    apiUrl.searchParams.set("block_ads", "true");

    console.log(`Capturing screenshot: ${screenshotUrl}`);
    
    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Screenshot API error:", errorText);
      return { success: false, error: `API returned ${response.status}` };
    }

    const imageBuffer = await response.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: "image/png" });

    const { error: uploadError } = await supabase.storage
      .from("dr-evidence")
      .upload(storagePath, imageBlob, { upsert: true });

    if (uploadError) {
      console.error("Screenshot upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    console.log(`Screenshot saved: ${storagePath}`);
    return { success: true, path: storagePath };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Screenshot capture failed:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let runId = "";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseForFlags = createClient(supabaseUrl, supabaseServiceKey);

    // TAEX-223: Check feature flag
    const flagCheck = await checkFeatureOrBlock(supabaseForFlags, 'automated_dr_drill_enabled', 'Automated DR Drill');
    if (!flagCheck.allowed) {
      return flagCheck.response;
    }

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User client for auth check
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is platform super admin
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleCheck } = await supabaseAdmin
      .from("platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleCheck || roleCheck.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestedEnv = body.environment || "staging";
    const confirmationPhrase = body.confirmation || "";

    // ============================================
    // SAFETY CONTROL A: Environment hard-block
    // ============================================
    const currentEnv = Deno.env.get("ENVIRONMENT") || "staging";
    
    if (currentEnv === "production" || requestedEnv === "production") {
      const blockResponse: BlockedResponse = {
        blocked: true,
        reason: "DR drills are BLOCKED in production environment. Use staging only.",
        code: "PRODUCTION_BLOCKED",
      };

      // Log the blocked attempt
      await supabaseAdmin.rpc("rpc_log_system_event", {
        p_source: "dr_drill_guard",
        p_severity: "error",
        p_code: "DR_DRILL_PRODUCTION_BLOCKED",
        p_message: "Attempted to run DR drill in production - BLOCKED",
        p_env: currentEnv,
        p_meta: {
          actor_id: user.id,
          actor_email: user.email,
          requested_env: requestedEnv,
          current_env: currentEnv,
        },
      });

      // Create blocked run record
      await supabaseAdmin.from("dr_drill_runs").insert({
        actor_id: user.id,
        actor_email: user.email,
        environment: requestedEnv,
        status: "blocked",
        blocked_reason: blockResponse.reason,
        ended_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify(blockResponse),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // SAFETY CONTROL B: Demo site allowlist
    // ============================================
    const allowlistEnv = Deno.env.get("DEMO_SITE_ID_ALLOWLIST") || "";
    const allowedSiteIds = allowlistEnv
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (allowedSiteIds.length === 0) {
      const blockResponse: BlockedResponse = {
        blocked: true,
        reason: "No demo sites configured in allowlist. Set DEMO_SITE_ID_ALLOWLIST env var.",
        code: "NO_ALLOWLIST",
      };

      await supabaseAdmin.rpc("rpc_log_system_event", {
        p_source: "dr_drill_guard",
        p_severity: "warn",
        p_code: "DR_DRILL_NO_ALLOWLIST",
        p_message: "DR drill blocked: no demo sites in allowlist",
        p_env: requestedEnv,
        p_meta: { actor_id: user.id },
      });

      await supabaseAdmin.from("dr_drill_runs").insert({
        actor_id: user.id,
        actor_email: user.email,
        environment: requestedEnv,
        status: "blocked",
        blocked_reason: blockResponse.reason,
        ended_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify(blockResponse),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // SAFETY CONTROL C.3: Type-to-confirm check
    // ============================================
    if (confirmationPhrase !== "RUN DR DRILL") {
      const blockResponse: BlockedResponse = {
        blocked: true,
        reason: "Confirmation phrase 'RUN DR DRILL' required.",
        code: "CONFIRMATION_REQUIRED",
      };

      return new Response(
        JSON.stringify(blockResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // SAFETY CONTROL C.4: Cooldown check (24h)
    // ============================================
    const cooldownCutoff = new Date();
    cooldownCutoff.setHours(cooldownCutoff.getHours() - COOLDOWN_HOURS);

    const { data: recentRuns, error: cooldownError } = await supabaseAdmin
      .from("dr_drill_runs")
      .select("id, started_at, status")
      .eq("environment", requestedEnv)
      .in("status", ["completed", "running"])
      .gte("started_at", cooldownCutoff.toISOString())
      .order("started_at", { ascending: false })
      .limit(1);

    if (!cooldownError && recentRuns && recentRuns.length > 0) {
      const lastRun = recentRuns[0];
      const lastRunTime = new Date(lastRun.started_at);
      const nextAllowed = new Date(lastRunTime.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
      const minutesRemaining = Math.ceil((nextAllowed.getTime() - Date.now()) / 60000);

      const blockResponse: BlockedResponse = {
        blocked: true,
        reason: `Cooldown active. Last run: ${lastRunTime.toISOString()}. Next allowed in ${minutesRemaining} minutes.`,
        code: "COOLDOWN_ACTIVE",
      };

      await supabaseAdmin.from("dr_drill_runs").insert({
        actor_id: user.id,
        actor_email: user.email,
        environment: requestedEnv,
        status: "blocked",
        blocked_reason: blockResponse.reason,
        ended_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify(blockResponse),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find an allowed demo site with data
    const { data: demoSites } = await supabaseAdmin
      .from("sites")
      .select("id, name")
      .eq("is_demo", true)
      .in("id", allowedSiteIds)
      .limit(1);

    if (!demoSites || demoSites.length === 0) {
      const blockResponse: BlockedResponse = {
        blocked: true,
        reason: "No matching demo sites found in allowlist. Check DEMO_SITE_ID_ALLOWLIST.",
        code: "NO_MATCHING_SITES",
      };

      await supabaseAdmin.from("dr_drill_runs").insert({
        actor_id: user.id,
        actor_email: user.email,
        environment: requestedEnv,
        status: "blocked",
        blocked_reason: blockResponse.reason,
        ended_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify(blockResponse),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetSite = demoSites[0];

    // ============================================
    // CREATE RUN RECORD + LOG DR_DRILL_START
    // ============================================
    const { data: runRecord, error: runError } = await supabaseAdmin
      .from("dr_drill_runs")
      .insert({
        actor_id: user.id,
        actor_email: user.email,
        environment: requestedEnv,
        site_id: targetSite.id,
        site_name: targetSite.name,
        status: "running",
      })
      .select()
      .single();

    if (runError || !runRecord) {
      console.error("Failed to create run record:", runError);
      throw new Error("Failed to initialize drill run");
    }

    runId = runRecord.id;

    await supabaseAdmin.rpc("rpc_create_audit_log", {
      p_actor_id: user.id,
      p_action: "DR_DRILL_START",
      p_target_table: "dr_drill_runs",
      p_target_id: runId,
      p_metadata: {
        environment: requestedEnv,
        site_id: targetSite.id,
        site_name: targetSite.name,
      },
    });

    const drillDate = new Date().toISOString().split("T")[0];
    const folderPath = `dr/${drillDate}`;
    const steps: DrillStep[] = [];
    const incidentSiteId = targetSite.id;
    const incidentType = "analytics_corruption";
    const screenshotApiKey = Deno.env.get("SCREENSHOTONE_API_KEY");
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://id-preview--0c20acb9-34c5-4f70-97e3-bbe92804c0d9.lovable.app";
    const screenshotResults: { before?: string; incident?: string; after?: string } = {};

    // ============================================
    // STEP 1: Capture Baseline
    // ============================================
    console.log("Step 1: Capturing baseline...");
    const step1Start = Date.now();

    const beforeSnapshot: SystemSnapshot = await captureSystemSnapshot(supabaseAdmin);

    // Capture "before" screenshot
    const beforeScreenshot = await captureScreenshot(
      supabaseAdmin,
      `${appBaseUrl}/admin/system-status`,
      `${folderPath}/before.png`,
      screenshotApiKey
    );
    if (beforeScreenshot.success) {
      screenshotResults.before = beforeScreenshot.path;
    }

    steps.push({
      name: "baseline_recorded",
      passed: true,
      details: `Sites: ${beforeSnapshot.sites_count}, Demo: ${beforeSnapshot.demo_sites_count}, Analytics 7d: ${beforeSnapshot.analytics_rows_7d}${beforeScreenshot.success ? ' (screenshot captured)' : ''}`,
      duration_ms: Date.now() - step1Start,
    });

    await logDrillStep(supabaseAdmin, user.id, runId, "baseline_recorded", true, steps[0].details);

    // ============================================
    // STEP 2: Simulate Incident (ANALYTICS ONLY - max 14 days)
    // SAFETY CONTROL C.1 & C.2: Only analytics, max 14 days
    // ============================================
    console.log("Step 2: Simulating incident (analytics only, max 14 days)...");
    const step2Start = Date.now();

    // Use MAX_CORRUPTION_DAYS (14) instead of 7
    const corruptionDays = Math.min(7, MAX_CORRUPTION_DAYS);
    const corruptionCutoff = new Date();
    corruptionCutoff.setDate(corruptionCutoff.getDate() - corruptionDays);

    // Count analytics rows before deletion
    const { count: beforeCount } = await supabaseAdmin
      .from("analytics_daily")
      .select("*", { count: "exact", head: true })
      .eq("site_id", incidentSiteId);

    // DELETE ONLY FROM analytics_daily (NEVER operations)
    const { error: deleteError, count: deletedCount } = await supabaseAdmin
      .from("analytics_daily")
      .delete({ count: "exact" })
      .eq("site_id", incidentSiteId)
      .gte("date", corruptionCutoff.toISOString().split("T")[0]);

    if (deleteError) {
      steps.push({
        name: "incident_simulated",
        passed: false,
        details: `Failed to simulate incident: ${deleteError.message}`,
        duration_ms: Date.now() - step2Start,
      });
    } else {
      steps.push({
        name: "incident_simulated",
        passed: true,
        details: `Deleted ${deletedCount || 0} analytics rows for demo site ${targetSite.name} (${corruptionDays} days, analytics_daily only)`,
        duration_ms: Date.now() - step2Start,
      });
    }

    await logDrillStep(supabaseAdmin, user.id, runId, "incident_simulated", steps[1].passed, steps[1].details);

    // Capture incident state
    const incidentSnapshot: SystemSnapshot = await captureSystemSnapshot(supabaseAdmin);

    // Capture "incident" screenshot
    const incidentScreenshot = await captureScreenshot(
      supabaseAdmin,
      `${appBaseUrl}/admin/system-status`,
      `${folderPath}/incident.png`,
      screenshotApiKey
    );
    if (incidentScreenshot.success) {
      screenshotResults.incident = incidentScreenshot.path;
    }

    // ============================================
    // STEP 3: Restore (recompute analytics)
    // ============================================
    console.log("Step 3: Restoring via recompute...");
    const step3Start = Date.now();

    try {
      const today = new Date();

      const recomputeResponse = await fetch(`${supabaseUrl}/functions/v1/recompute-analytics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          site_id: incidentSiteId,
          start_date: corruptionCutoff.toISOString().split("T")[0],
          end_date: today.toISOString().split("T")[0],
        }),
      });

      if (recomputeResponse.ok) {
        steps.push({
          name: "restoration_completed",
          passed: true,
          details: "Analytics recomputed successfully",
          duration_ms: Date.now() - step3Start,
        });
      } else {
        const errorText = await recomputeResponse.text();
        steps.push({
          name: "restoration_completed",
          passed: false,
          details: `Recompute failed: ${errorText}`,
          duration_ms: Date.now() - step3Start,
        });
      }
    } catch (restoreError) {
      steps.push({
        name: "restoration_completed",
        passed: false,
        details: `Restoration error: ${restoreError instanceof Error ? restoreError.message : "Unknown"}`,
        duration_ms: Date.now() - step3Start,
      });
    }

    await logDrillStep(supabaseAdmin, user.id, runId, "restoration_completed", steps[2].passed, steps[2].details);

    // ============================================
    // STEP 4: Run smoke tests
    // ============================================
    console.log("Step 4: Running smoke tests...");
    const step4Start = Date.now();

    try {
      const { data: smokeResults, error: smokeError } = await supabaseAdmin.rpc(
        "rpc_run_smoke_tests",
        { p_site_id: incidentSiteId }
      );

      if (smokeError) {
        steps.push({
          name: "smoke_tests_passed",
          passed: false,
          details: `Smoke test error: ${smokeError.message}`,
          duration_ms: Date.now() - step4Start,
        });
      } else {
        const failures = (smokeResults || []).filter((r: { ok: boolean }) => !r.ok);
        steps.push({
          name: "smoke_tests_passed",
          passed: failures.length === 0,
          details: failures.length === 0
            ? `All ${smokeResults?.length || 0} tests passed`
            : `${failures.length} test(s) failed: ${failures.map((f: { test_key: string }) => f.test_key).join(", ")}`,
          duration_ms: Date.now() - step4Start,
        });
      }
    } catch (e) {
      steps.push({
        name: "smoke_tests_passed",
        passed: false,
        details: `Exception: ${e instanceof Error ? e.message : "Unknown"}`,
        duration_ms: Date.now() - step4Start,
      });
    }

    await logDrillStep(supabaseAdmin, user.id, runId, "smoke_tests_passed", steps[3].passed, steps[3].details);

    // ============================================
    // STEP 5: Verify system status
    // ============================================
    console.log("Step 5: Verifying system status...");
    const step5Start = Date.now();

    const afterSnapshot: SystemSnapshot = await captureSystemSnapshot(supabaseAdmin);

    // Capture "after" screenshot
    const afterScreenshot = await captureScreenshot(
      supabaseAdmin,
      `${appBaseUrl}/admin/system-status`,
      `${folderPath}/after.png`,
      screenshotApiKey
    );
    if (afterScreenshot.success) {
      screenshotResults.after = afterScreenshot.path;
    }

    const systemClean = afterSnapshot.critical_events_24h === 0;
    steps.push({
      name: "system_status_clean",
      passed: systemClean,
      details: systemClean
        ? `No critical events in last 24h${afterScreenshot.success ? ' (screenshot captured)' : ''}`
        : `${afterSnapshot.critical_events_24h} critical event(s) detected`,
      duration_ms: Date.now() - step5Start,
    });

    await logDrillStep(supabaseAdmin, user.id, runId, "system_status_clean", steps[4].passed, steps[4].details);

    // ============================================
    // Calculate results and upload artifacts
    // ============================================
    const totalDuration = Date.now() - startTime;
    const allPassed = steps.every((s) => s.passed);
    const rtoMet = totalDuration < RTO_TARGET_MINUTES * 60 * 1000;

    // Build results.json
    const results = {
      run_id: runId,
      drill_date: drillDate,
      actor_id: user.id,
      actor_email: user.email,
      environment: requestedEnv,
      incident_type: incidentType,
      incident_site_id: incidentSiteId,
      incident_site_name: targetSite.name,
      duration_minutes: Math.round(totalDuration / 60000),
      duration_ms: totalDuration,
      rto_target_minutes: RTO_TARGET_MINUTES,
      rto_met: rtoMet,
      overall_passed: allPassed,
      safety_controls: {
        production_blocked: true,
        demo_site_allowlist: allowedSiteIds,
        max_corruption_days: MAX_CORRUPTION_DAYS,
        cooldown_hours: COOLDOWN_HOURS,
        operations_table_protected: true,
      },
      steps: steps.reduce(
        (acc, step) => ({ ...acc, [step.name]: step.passed }),
        {} as Record<string, boolean>
      ),
      step_details: steps,
      snapshots: {
        before: beforeSnapshot,
        incident: incidentSnapshot,
        after: afterSnapshot,
      },
      screenshots: screenshotResults,
      failures: steps.filter((s) => !s.passed).map((s) => s.name),
      notes: allPassed
        ? "Drill completed successfully. All checks passed."
        : `Drill completed with ${steps.filter((s) => !s.passed).length} failure(s).`,
    };

    // Upload results.json to storage (folderPath already declared earlier)
    const resultsJson = JSON.stringify(results, null, 2);
    const resultsBlob = new Blob([resultsJson], { type: "application/json" });

    const { error: uploadError } = await supabaseAdmin.storage
      .from("dr-evidence")
      .upload(`${folderPath}/results.json`, resultsBlob, { upsert: true });

    if (uploadError) {
      console.error("Failed to upload results.json:", uploadError);
    }

    // Upload system state snapshots
    const stateJson = JSON.stringify(
      {
        captured_at: new Date().toISOString(),
        run_id: runId,
        before: beforeSnapshot,
        incident: incidentSnapshot,
        after: afterSnapshot,
      },
      null,
      2
    );
    const stateBlob = new Blob([stateJson], { type: "application/json" });

    await supabaseAdmin.storage
      .from("dr-evidence")
      .upload(`${folderPath}/system-state.json`, stateBlob, { upsert: true });

    const artifactsPaths = {
      results: `${folderPath}/results.json`,
      system_state: `${folderPath}/system-state.json`,
      ...screenshotResults,
    };

    // ============================================
    // Update run record with final status
    // ============================================
    await supabaseAdmin
      .from("dr_drill_runs")
      .update({
        ended_at: new Date().toISOString(),
        status: "completed",
        duration_ms: totalDuration,
        overall_passed: allPassed,
        rto_met: rtoMet,
        steps_summary: results.steps,
        artifacts_paths: artifactsPaths,
      })
      .eq("id", runId);

    // Log DR_DRILL_END
    await supabaseAdmin.rpc("rpc_create_audit_log", {
      p_actor_id: user.id,
      p_action: "DR_DRILL_END",
      p_target_table: "dr_drill_runs",
      p_target_id: runId,
      p_metadata: {
        drill_date: drillDate,
        environment: requestedEnv,
        duration_minutes: Math.round(totalDuration / 60000),
        overall_passed: allPassed,
        rto_met: rtoMet,
        failures: results.failures,
      },
    });

    // Log to system_events
    await supabaseAdmin.rpc("rpc_log_system_event", {
      p_source: "dr_drill",
      p_severity: allPassed ? "info" : "warn",
      p_code: allPassed ? "DR_DRILL_PASSED" : "DR_DRILL_FAILED",
      p_message: allPassed
        ? `DR drill completed successfully in ${Math.round(totalDuration / 60000)} minutes`
        : `DR drill completed with ${results.failures.length} failure(s)`,
      p_env: requestedEnv,
      p_meta: {
        run_id: runId,
        drill_date: drillDate,
        actor_id: user.id,
        failures: results.failures,
        duration_minutes: Math.round(totalDuration / 60000),
        rto_met: rtoMet,
      },
    });

    console.log("DR drill completed:", { runId, allPassed, duration: totalDuration });

    return new Response(
      JSON.stringify({
        success: allPassed,
        run_id: runId,
        drill_date: drillDate,
        duration_minutes: Math.round(totalDuration / 60000),
        rto_met: rtoMet,
        steps,
        message: allPassed
          ? "Drill completed successfully"
          : `Drill completed with failures: ${results.failures.join(", ")}`,
        artifacts_paths: artifactsPaths,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("DR drill error:", error);

    // Update run record if we have one
    if (runId) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      await supabaseAdmin
        .from("dr_drill_runs")
        .update({
          ended_at: new Date().toISOString(),
          status: "failed",
          duration_ms: Date.now() - startTime,
          blocked_reason: errorMessage,
        })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Log drill step to audit
// deno-lint-ignore no-explicit-any
async function logDrillStep(
  supabase: any,
  actorId: string,
  runId: string,
  stepName: string,
  passed: boolean,
  details: string
) {
  await supabase.rpc("rpc_create_audit_log", {
    p_actor_id: actorId,
    p_action: "DR_DRILL_STEP",
    p_target_table: "dr_drill_runs",
    p_target_id: runId,
    p_metadata: { step: stepName, passed, details },
  });
}

// deno-lint-ignore no-explicit-any
async function captureSystemSnapshot(supabase: any): Promise<SystemSnapshot> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Get sites count
  const { count: sitesCount } = await supabase
    .from("sites")
    .select("*", { count: "exact", head: true })
    .eq("is_demo", false);

  const { count: demoSitesCount } = await supabase
    .from("sites")
    .select("*", { count: "exact", head: true })
    .eq("is_demo", true);

  // Get analytics rows in last 7 days
  const { count: analyticsCount } = await supabase
    .from("analytics_daily")
    .select("*", { count: "exact", head: true })
    .gte("date", sevenDaysAgo.toISOString().split("T")[0]);

  // Get critical events in last 24h
  const { count: criticalCount } = await supabase
    .from("system_events")
    .select("*", { count: "exact", head: true })
    .eq("severity", "critical")
    .gte("created_at", oneDayAgo.toISOString());

  const { count: errorCount } = await supabase
    .from("system_events")
    .select("*", { count: "exact", head: true })
    .eq("severity", "error")
    .gte("created_at", oneDayAgo.toISOString());

  return {
    timestamp: now.toISOString(),
    sites_count: sitesCount || 0,
    demo_sites_count: demoSitesCount || 0,
    analytics_rows_7d: analyticsCount || 0,
    critical_events_24h: criticalCount || 0,
    error_events_24h: errorCount || 0,
  };
}
