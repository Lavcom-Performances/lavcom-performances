import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify super_admin role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from("platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check concurrency: no running backup
    const { data: runningJob } = await serviceClient
      .from("backup_jobs")
      .select("id")
      .eq("status", "running")
      .maybeSingle();

    if (runningJob) {
      return new Response(
        JSON.stringify({ error: "A backup is already running", job_id: runningJob.id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      throw new Error(`Failed to create backup job: ${insertError?.message}`);
    }

    // Trigger GitHub Actions workflow
    const githubToken = Deno.env.get("GITHUB_PAT");
    if (!githubToken) {
      // Mark job as failed if no GitHub token
      await serviceClient
        .from("backup_jobs")
        .update({ status: "failed", error_message: "GITHUB_PAT secret not configured", completed_at: new Date().toISOString() })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({ error: "GITHUB_PAT secret not configured. Please add it to run backups." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const githubRepo = Deno.env.get("GITHUB_REPO"); // format: "owner/repo"
    if (!githubRepo) {
      await serviceClient
        .from("backup_jobs")
        .update({ status: "failed", error_message: "GITHUB_REPO secret not configured", completed_at: new Date().toISOString() })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({ error: "GITHUB_REPO secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dispatch GitHub workflow
    const dispatchResponse = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/workflows/backup.yml/dispatches`,
      {
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
      }
    );

    if (!dispatchResponse.ok) {
      const errText = await dispatchResponse.text();
      await serviceClient
        .from("backup_jobs")
        .update({ status: "failed", error_message: `GitHub dispatch failed: ${errText}`, completed_at: new Date().toISOString() })
        .eq("id", job.id);

      throw new Error(`GitHub workflow dispatch failed: ${errText}`);
    }

    // Log to system_events
    await serviceClient.from("system_events").insert({
      source: "backup_system",
      severity: "info",
      message: `Manual backup triggered by ${user.email}`,
      details: { job_id: job.id, triggered_by: user.id },
    }).catch(() => {}); // non-blocking

    return new Response(
      JSON.stringify({ success: true, job_id: job.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("backup-system error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
