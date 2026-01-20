import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[cleanup-compliance-reports] ${step}${detailsStr}`);
};

const DEFAULT_RETENTION_YEARS = 2;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Starting compliance reports cleanup");

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate - accept either CRON_SECRET or platform admin token
    const cronSecretHeader = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('authorization');
    let actorId: string | null = null;
    let isManualTrigger = false;

    if (cronSecretHeader && cronSecret && cronSecretHeader === cronSecret) {
      logStep("Authenticated via CRON_SECRET");
      actorId = 'cron';
    } else if (authHeader) {
      const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !user) {
        throw new Error('Unauthorized');
      }

      // Must be super_admin for manual cleanup
      const { data: platformRole } = await supabaseAdmin
        .from('platform_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .single();

      if (!platformRole) {
        throw new Error('Access denied - super_admin required');
      }

      actorId = user.id;
      isManualTrigger = true;
      logStep("Authenticated as super_admin", { user_id: user.id });
    } else {
      throw new Error('Missing authentication');
    }

    // Parse optional retention override from body
    let retentionYears = DEFAULT_RETENTION_YEARS;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.retention_years && typeof body.retention_years === 'number') {
          retentionYears = Math.max(1, Math.min(5, body.retention_years));
        }
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);
    const cutoffIso = cutoffDate.toISOString();

    logStep("Cleanup parameters", { retentionYears, cutoffDate: cutoffIso });

    // Find reports older than retention period
    const { data: oldReports, error: fetchError } = await supabaseAdmin
      .from('compliance_reports')
      .select('id, file_path, period_label, generated_at, sha256_checksum')
      .lt('generated_at', cutoffIso)
      .order('generated_at', { ascending: true });

    if (fetchError) {
      logStep("Error fetching old reports", fetchError);
      throw fetchError;
    }

    if (!oldReports || oldReports.length === 0) {
      logStep("No reports to clean up");
      
      // Log to system_events
      await supabaseAdmin.rpc('rpc_log_system_event', {
        p_env: 'prod',
        p_source: 'cleanup_compliance_reports',
        p_severity: 'info',
        p_code: 'CLEANUP_NO_REPORTS',
        p_message: `No compliance reports to clean up (retention: ${retentionYears} years)`,
        p_meta: {
          cutoff_date: cutoffIso,
          is_manual: isManualTrigger,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          deleted_count: 0,
          retention_years: retentionYears,
          cutoff_date: cutoffIso,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep(`Found ${oldReports.length} reports to delete`);

    let filesDeleted = 0;
    let filesFailedToDelete = 0;
    const deletedReportIds: string[] = [];

    // Delete files from storage first
    for (const report of oldReports) {
      if (report.file_path) {
        const { error: deleteFileError } = await supabaseAdmin.storage
          .from('compliance-reports')
          .remove([report.file_path]);

        if (deleteFileError) {
          logStep("Failed to delete file", { file_path: report.file_path, error: deleteFileError });
          filesFailedToDelete++;
        } else {
          filesDeleted++;
        }
      }
      deletedReportIds.push(report.id);
    }

    // Delete records from database
    const { error: deleteDbError } = await supabaseAdmin
      .from('compliance_reports')
      .delete()
      .in('id', deletedReportIds);

    if (deleteDbError) {
      logStep("Error deleting database records", deleteDbError);
      throw deleteDbError;
    }

    logStep("Cleanup completed", {
      reports_deleted: deletedReportIds.length,
      files_deleted: filesDeleted,
      files_failed: filesFailedToDelete,
    });

    // Log to audit_logs
    await supabaseAdmin.rpc('rpc_create_audit_log', {
      p_actor_id: actorId === 'cron' ? null : actorId,
      p_action: 'COMPLIANCE_REPORTS_CLEANUP',
      p_target_table: 'compliance_reports',
      p_target_id: null,
      p_metadata: {
        deleted_count: deletedReportIds.length,
        retention_years: retentionYears,
        cutoff_date: cutoffIso,
        is_manual: isManualTrigger,
        files_deleted: filesDeleted,
        files_failed: filesFailedToDelete,
      },
      p_user_agent: req.headers.get('user-agent'),
      p_ip_hash: null,
    });

    // Log to system_events
    await supabaseAdmin.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'cleanup_compliance_reports',
      p_severity: 'info',
      p_code: 'CLEANUP_COMPLETED',
      p_message: `Cleaned up ${deletedReportIds.length} compliance reports older than ${retentionYears} years`,
      p_meta: {
        deleted_count: deletedReportIds.length,
        retention_years: retentionYears,
        cutoff_date: cutoffIso,
        is_manual: isManualTrigger,
        files_deleted: filesDeleted,
        files_failed: filesFailedToDelete,
        deleted_periods: oldReports.map(r => r.period_label),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedReportIds.length,
        files_deleted: filesDeleted,
        files_failed: filesFailedToDelete,
        retention_years: retentionYears,
        cutoff_date: cutoffIso,
        is_manual: isManualTrigger,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error during cleanup", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
