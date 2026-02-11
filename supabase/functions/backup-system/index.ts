import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface LogEntry {
  timestamp: string;
  step: string;
  status: "ok" | "error" | "info";
  detail?: string;
}

function logStep(logs: LogEntry[], step: string, status: "ok" | "error" | "info", detail?: string) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    step,
    status,
    detail,
  };
  logs.push(entry);
  console.log(`[backup-system] [${status.toUpperCase()}] ${step}${detail ? ` — ${detail}` : ""}`);
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const logs: LogEntry[] = [];

  try {
    logStep(logs, "Start", "info", "Backup system invoked");

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep(logs, "Auth", "error", "Missing authorization header");
      return new Response(JSON.stringify({ error: "Missing authorization", logs }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep(logs, "Auth header", "ok", "Present");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      logStep(logs, "JWT verification", "error", userError?.message || "No user found");
      return new Response(JSON.stringify({ error: "Invalid token", logs }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep(logs, "JWT verification", "ok", `User: ${user.email}`);

    // Verify super_admin role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from("platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      logStep(logs, "Role check", "error", "User is not super_admin");
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only", logs }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep(logs, "Role check", "ok", "super_admin confirmed");

    // Check concurrency: no running backup
    const { data: runningJob } = await serviceClient
      .from("backup_jobs")
      .select("id")
      .eq("status", "running")
      .maybeSingle();

    if (runningJob) {
      logStep(logs, "Concurrency check", "error", `Already running: ${runningJob.id}`);
      return new Response(
        JSON.stringify({ error: "A backup is already running", job_id: runningJob.id, logs }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep(logs, "Concurrency check", "ok", "No running backup");

    // Insert backup job
    const { data: job, error: insertError } = await serviceClient
      .from("backup_jobs")
      .insert({
        triggered_by: user.id,
        trigger_type: "manual",
        status: "running",
      })
      .select("id")
      .single();

    if (insertError || !job) {
      logStep(logs, "Create job", "error", insertError?.message || "Unknown insert error");
      throw new Error(`Failed to create backup job: ${insertError?.message}`);
    }
    logStep(logs, "Create job", "ok", `Job ID: ${job.id}`);

    // Check GitHub secrets
    const githubToken = Deno.env.get("GITHUB_PAT");
    if (!githubToken) {
      logStep(logs, "Check GITHUB_PAT", "error", "Secret not configured");
      await serviceClient
        .from("backup_jobs")
        .update({ status: "failed", error_message: "GITHUB_PAT secret not configured", completed_at: new Date().toISOString() })
        .eq("id", job.id);
      return new Response(
        JSON.stringify({ error: "GITHUB_PAT secret not configured", logs }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep(logs, "Check GITHUB_PAT", "ok", `Token starts with: ${githubToken.substring(0, 8)}...`);

    const githubRepo = Deno.env.get("GITHUB_REPO");
    if (!githubRepo) {
      logStep(logs, "Check GITHUB_REPO", "error", "Secret not configured");
      await serviceClient
        .from("backup_jobs")
        .update({ status: "failed", error_message: "GITHUB_REPO secret not configured", completed_at: new Date().toISOString() })
        .eq("id", job.id);
      return new Response(
        JSON.stringify({ error: "GITHUB_REPO secret not configured", logs }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep(logs, "Check GITHUB_REPO", "ok", `Repo: ${githubRepo}`);

    // Validate repo format
    const repoPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
    if (!repoPattern.test(githubRepo)) {
      const errMsg = `Invalid GITHUB_REPO format: "${githubRepo}". Expected "owner/repo" (e.g. "myuser/my-project")`;
      logStep(logs, "Validate GITHUB_REPO format", "error", errMsg);
      await serviceClient
        .from("backup_jobs")
        .update({ status: "failed", error_message: errMsg, completed_at: new Date().toISOString() })
        .eq("id", job.id);
      return new Response(
        JSON.stringify({ error: errMsg, logs }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep(logs, "Validate GITHUB_REPO format", "ok", "Format is owner/repo");

    // Build dispatch URL
    const dispatchUrl = `https://api.github.com/repos/${githubRepo}/actions/workflows/backup.yml/dispatches`;
    logStep(logs, "Build dispatch URL", "info", dispatchUrl);

    // Check if workflow file exists first
    const checkWorkflowUrl = `https://api.github.com/repos/${githubRepo}/actions/workflows/backup.yml`;
    logStep(logs, "Check workflow exists", "info", checkWorkflowUrl);

    const workflowCheck = await fetch(checkWorkflowUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!workflowCheck.ok) {
      const checkBody = await workflowCheck.text();
      const errMsg = `Workflow check failed (${workflowCheck.status}): ${checkBody}. Make sure .github/workflows/backup.yml exists on the main branch of ${githubRepo}`;
      logStep(logs, "Check workflow exists", "error", errMsg);
      await serviceClient
        .from("backup_jobs")
        .update({ status: "failed", error_message: errMsg, completed_at: new Date().toISOString() })
        .eq("id", job.id);

      // Save logs to system_events
      await serviceClient.from("system_events").insert({
        source: "backup_system",
        severity: "error",
        message: `Backup failed: workflow not found`,
        details: { job_id: job.id, logs },
      }).catch(() => {});

      return new Response(
        JSON.stringify({ error: errMsg, logs }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep(logs, "Check workflow exists", "ok", "Workflow file found");

    // Dispatch GitHub workflow
    logStep(logs, "Dispatch workflow", "info", "Sending dispatch request...");
    const dispatchResponse = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          job_id: job.id,
          trigger_type: "manual",
        },
      }),
    });

    if (!dispatchResponse.ok) {
      const errText = await dispatchResponse.text();
      const errMsg = `GitHub dispatch failed (${dispatchResponse.status}): ${errText}`;
      logStep(logs, "Dispatch workflow", "error", errMsg);
      await serviceClient
        .from("backup_jobs")
        .update({ status: "failed", error_message: errMsg, completed_at: new Date().toISOString() })
        .eq("id", job.id);

      // Save logs to system_events
      await serviceClient.from("system_events").insert({
        source: "backup_system",
        severity: "error",
        message: `Backup dispatch failed`,
        details: { job_id: job.id, logs },
      }).catch(() => {});

      return new Response(
        JSON.stringify({ error: errMsg, logs }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep(logs, "Dispatch workflow", "ok", "GitHub Actions workflow dispatched successfully");

    // Log success to system_events
    await serviceClient.from("system_events").insert({
      source: "backup_system",
      severity: "info",
      message: `Manual backup triggered by ${user.email}`,
      details: { job_id: job.id, logs },
    }).catch(() => {});

    logStep(logs, "Complete", "ok", `Backup job ${job.id} dispatched`);

    return new Response(
      JSON.stringify({ success: true, job_id: job.id, logs }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep(logs, "Unhandled error", "error", error.message);
    console.error("backup-system error:", error);
    return new Response(
      JSON.stringify({ error: error.message, logs }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
