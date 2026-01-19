import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default retention periods by plan (in days)
const PLAN_RETENTION_DAYS: Record<string, number> = {
  'free': 30,
  'starter': 90,
  'pro': 180,
  'enterprise': 365,
  'default': 90,
};

// Minimum retention to ensure compliance
const MIN_RETENTION_DAYS = 30;
const MAX_RETENTION_DAYS = 730; // 2 years max

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[cleanup-audit-logs] ${step}${detailsStr}`);
};

interface CleanupStats {
  usersProcessed: number;
  totalDeleted: number;
  archivedCount: number;
  archiveFiles: number;
  errors: string[];
  detailsByUser: { userId: string; deleted: number; archived: number; retentionDays: number }[];
}

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Starting audit log cleanup job");

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const stats: CleanupStats = {
      usersProcessed: 0,
      totalDeleted: 0,
      archivedCount: 0,
      archiveFiles: 0,
      errors: [],
      detailsByUser: [],
    };

    // Get all profiles with their plan, retention settings, and archive preference
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, plan_code, log_retention_days');

    if (profilesError) {
      logStep("Error fetching profiles", profilesError);
      throw profilesError;
    }

    // Get notification preferences to check archive settings
    const profileIds = profiles?.map(p => p.id) || [];
    const { data: notifPrefs } = await supabase
      .from('notification_preferences')
      .select('user_id, archive_before_deletion')
      .in('user_id', profileIds);

    const archivePrefsMap = new Map(
      notifPrefs?.map(p => [p.user_id, p.archive_before_deletion ?? true]) || []
    );

    logStep("Profiles fetched", { count: profiles?.length || 0 });

    // Process each user with their specific retention period
    for (const profile of profiles || []) {
      stats.usersProcessed++;

      // Determine retention days based on user setting, plan, or default
      let retentionDays: number;
      
      if (profile.log_retention_days && profile.log_retention_days > 0) {
        // User has a custom setting
        retentionDays = Math.max(MIN_RETENTION_DAYS, Math.min(MAX_RETENTION_DAYS, profile.log_retention_days));
      } else if (profile.plan_code && PLAN_RETENTION_DAYS[profile.plan_code]) {
        // Use plan-based retention
        retentionDays = PLAN_RETENTION_DAYS[profile.plan_code];
      } else {
        // Default retention
        retentionDays = PLAN_RETENTION_DAYS.default;
      }

      // Calculate the cutoff date for this user
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffDateStr = cutoffDate.toISOString();

      // Check if user wants to archive before deletion
      const shouldArchive = archivePrefsMap.get(profile.id) ?? true;

      try {
        // Fetch logs to be deleted
        const { data: logsToDelete, count: countToDelete } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .eq('actor_id', profile.id)
          .lt('created_at', cutoffDateStr)
          .order('created_at', { ascending: true })
          .limit(1000); // Process in batches

        if (!countToDelete || countToDelete === 0) {
          continue; // No logs to delete for this user
        }

        logStep(`User ${profile.id}: ${countToDelete} logs older than ${retentionDays} days`);

        let archivedCount = 0;

        // Archive logs before deletion if enabled
        if (shouldArchive && logsToDelete && logsToDelete.length > 0) {
          try {
            const archiveData = {
              exported_at: new Date().toISOString(),
              user_id: profile.id,
              retention_days: retentionDays,
              logs: logsToDelete as AuditLog[],
            };

            const archiveJson = JSON.stringify(archiveData, null, 2);
            const archiveBlob = new Blob([archiveJson], { type: 'application/json' });

            // Create unique filename with date range
            const oldestLog = logsToDelete[0] as AuditLog;
            const newestLog = logsToDelete[logsToDelete.length - 1] as AuditLog;
            const dateRangeStart = oldestLog.created_at.split('T')[0];
            const dateRangeEnd = newestLog.created_at.split('T')[0];
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${profile.id}/audit-logs_${dateRangeStart}_to_${dateRangeEnd}_${timestamp}.json`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from('audit-archives')
              .upload(fileName, archiveBlob, {
                contentType: 'application/json',
                upsert: false,
              });

            if (uploadError) {
              logStep(`Archive upload failed for user ${profile.id}`, uploadError);
              stats.errors.push(`Archive upload failed for ${profile.id}: ${uploadError.message}`);
            } else {
              // Record the archive in the tracking table
              await supabase.from('audit_log_archives').insert({
                user_id: profile.id,
                file_path: fileName,
                records_count: logsToDelete.length,
                date_range_start: oldestLog.created_at,
                date_range_end: newestLog.created_at,
                file_size_bytes: archiveBlob.size,
              });

              archivedCount = logsToDelete.length;
              stats.archivedCount += archivedCount;
              stats.archiveFiles++;
              logStep(`Archived ${archivedCount} logs for user ${profile.id}`);
            }
          } catch (archiveError) {
            const errorMsg = archiveError instanceof Error ? archiveError.message : String(archiveError);
            stats.errors.push(`Archive error for ${profile.id}: ${errorMsg}`);
            logStep(`Archive error for user ${profile.id}`, { error: errorMsg });
          }
        }

        // Delete old audit logs for this user
        const { error: deleteError } = await supabase
          .from('audit_logs')
          .delete()
          .eq('actor_id', profile.id)
          .lt('created_at', cutoffDateStr);

        if (deleteError) {
          stats.errors.push(`User ${profile.id}: ${deleteError.message}`);
          logStep(`Error deleting logs for user ${profile.id}`, deleteError);
          continue;
        }

        stats.totalDeleted += countToDelete;
        stats.detailsByUser.push({
          userId: profile.id,
          deleted: countToDelete,
          archived: archivedCount,
          retentionDays,
        });

        logStep(`User ${profile.id}: deleted ${countToDelete} logs (archived: ${archivedCount})`);
      } catch (userError) {
        const errorMsg = userError instanceof Error ? userError.message : String(userError);
        stats.errors.push(`User ${profile.id}: ${errorMsg}`);
        logStep(`Error processing user ${profile.id}`, { error: errorMsg });
      }
    }

    // Also cleanup orphaned logs (where actor_id doesn't exist in profiles)
    const orphanCutoff = new Date();
    orphanCutoff.setDate(orphanCutoff.getDate() - PLAN_RETENTION_DAYS.default);

    const { count: orphanCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .is('actor_id', null)
      .lt('created_at', orphanCutoff.toISOString());

    if (orphanCount && orphanCount > 0) {
      logStep(`Cleaning up ${orphanCount} orphaned logs`);
      
      const { error: orphanError } = await supabase
        .from('audit_logs')
        .delete()
        .is('actor_id', null)
        .lt('created_at', orphanCutoff.toISOString());

      if (!orphanError) {
        stats.totalDeleted += orphanCount;
        stats.detailsByUser.push({
          userId: 'system_orphans',
          deleted: orphanCount,
          archived: 0,
          retentionDays: PLAN_RETENTION_DAYS.default,
        });
      } else {
        stats.errors.push(`Orphaned logs: ${orphanError.message}`);
      }
    }

    // Log cleanup completion to system_events
    await supabase.from('system_events').insert({
      source: 'cleanup-audit-logs',
      severity: stats.errors.length > 0 ? 'warn' : 'info',
      code: 'CLEANUP_COMPLETE',
      message: `Audit log cleanup completed: ${stats.totalDeleted} logs deleted, ${stats.archivedCount} archived`,
      meta: {
        usersProcessed: stats.usersProcessed,
        totalDeleted: stats.totalDeleted,
        archivedCount: stats.archivedCount,
        archiveFiles: stats.archiveFiles,
        usersWithDeletions: stats.detailsByUser.length,
        errorCount: stats.errors.length,
      },
    });

    logStep("Job complete", {
      usersProcessed: stats.usersProcessed,
      totalDeleted: stats.totalDeleted,
      archivedCount: stats.archivedCount,
      archiveFiles: stats.archiveFiles,
      usersWithDeletions: stats.detailsByUser.length,
      errors: stats.errors.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        stats,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
