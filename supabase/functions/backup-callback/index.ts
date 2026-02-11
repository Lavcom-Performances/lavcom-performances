import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Validate callback secret
    const callbackSecret = Deno.env.get("BACKUP_CALLBACK_SECRET");
    if (!callbackSecret) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("X-Backup-Secret") || req.headers.get("Authorization")?.replace("Bearer ", "");
    if (authHeader !== callbackSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { job_id, status, files, total_size, error_message } = body;

    if (!job_id || !status) {
      return new Response(JSON.stringify({ error: "Missing job_id or status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Update backup job status
    const updateData: Record<string, unknown> = {
      status,
      completed_at: new Date().toISOString(),
    };
    if (total_size) updateData.total_size = total_size;
    if (error_message) updateData.error_message = error_message;

    const { error: updateError } = await serviceClient
      .from("backup_jobs")
      .update(updateData)
      .eq("id", job_id);

    if (updateError) {
      throw new Error(`Failed to update backup job: ${updateError.message}`);
    }

    // Insert backup files if completed
    if (status === "completed" && files && Array.isArray(files)) {
      const fileRecords = files.map((f: { type: string; path: string; size: number }) => ({
        backup_job_id: job_id,
        file_type: f.type,
        file_path: f.path,
        file_size: f.size,
      }));

      const { error: filesError } = await serviceClient
        .from("backup_files")
        .insert(fileRecords);

      if (filesError) {
        console.error("Failed to insert backup files:", filesError);
      }
    }

    // Retention cleanup: delete backups older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: oldJobs } = await serviceClient
      .from("backup_jobs")
      .select("id")
      .lt("created_at", thirtyDaysAgo.toISOString())
      .eq("status", "completed");

    if (oldJobs && oldJobs.length > 0) {
      for (const oldJob of oldJobs) {
        // Get files to delete from storage
        const { data: oldFiles } = await serviceClient
          .from("backup_files")
          .select("file_path")
          .eq("backup_job_id", oldJob.id);

        if (oldFiles) {
          for (const file of oldFiles) {
            await serviceClient.storage.from("backups").remove([file.file_path]);
          }
        }

        // Delete job (cascades to backup_files)
        await serviceClient.from("backup_jobs").delete().eq("id", oldJob.id);
      }

      console.log(`Retention cleanup: removed ${oldJobs.length} old backups`);
    }

    // Log event
    const severity = status === "failed" ? "error" : "info";
    await serviceClient.from("system_events").insert({
      source: "backup_system",
      severity,
      message: status === "completed"
        ? `Backup completed successfully (${formatBytes(total_size || 0)})`
        : `Backup failed: ${error_message || "Unknown error"}`,
      details: { job_id, status, total_size, files_count: files?.length || 0 },
    }).catch(() => {});

    // Send alert on failure
    if (status === "failed") {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-system-alert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            title: "🚨 Backup Failed",
            message: `Backup job ${job_id} failed: ${error_message || "Unknown error"}`,
            severity: "critical",
            source: "backup_system",
          }),
        });
      } catch (alertErr) {
        console.error("Failed to send backup failure alert:", alertErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("backup-callback error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
