import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default archive retention: 2 years
const DEFAULT_ARCHIVE_RETENTION_DAYS = 730;
// Maximum allowed retention: 5 years
const MAX_ARCHIVE_RETENTION_DAYS = 1825;
// Minimum retention: 1 year
const MIN_ARCHIVE_RETENTION_DAYS = 365;

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[cleanup-audit-archives] ${step}${detailsStr}`);
};

interface CleanupStats {
  archivesDeleted: number;
  storageFilesDeleted: number;
  totalSizeFreedBytes: number;
  errors: string[];
  deletedArchives: { id: string; file_path: string; created_at: string; records_count: number }[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Starting audit archive cleanup job");

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const stats: CleanupStats = {
      archivesDeleted: 0,
      storageFilesDeleted: 0,
      totalSizeFreedBytes: 0,
      errors: [],
      deletedArchives: [],
    };

    // Get optional retention days from request body (for manual runs with custom retention)
    let retentionDays = DEFAULT_ARCHIVE_RETENTION_DAYS;
    try {
      const body = await req.json();
      if (body.retention_days && typeof body.retention_days === 'number') {
        retentionDays = Math.max(
          MIN_ARCHIVE_RETENTION_DAYS,
          Math.min(MAX_ARCHIVE_RETENTION_DAYS, body.retention_days)
        );
        logStep(`Using custom retention: ${retentionDays} days`);
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateStr = cutoffDate.toISOString();

    logStep(`Cleaning archives older than ${retentionDays} days (before ${cutoffDateStr})`);

    // Find archives older than retention period
    const { data: oldArchives, error: fetchError } = await supabase
      .from('audit_log_archives')
      .select('id, file_path, created_at, records_count, file_size_bytes, user_id')
      .lt('created_at', cutoffDateStr)
      .order('created_at', { ascending: true })
      .limit(100); // Process in batches to avoid timeouts

    if (fetchError) {
      logStep("Error fetching archives", fetchError);
      throw fetchError;
    }

    if (!oldArchives || oldArchives.length === 0) {
      logStep("No archives to clean up");

      // Log to system_events
      await supabase.from('system_events').insert({
        source: 'cleanup-audit-archives',
        severity: 'info',
        code: 'CLEANUP_NOOP',
        message: `No archives older than ${retentionDays} days found`,
        meta: { retention_days: retentionDays, cutoff_date: cutoffDateStr },
      });

      return new Response(
        JSON.stringify({ success: true, message: 'No archives to clean', stats }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep(`Found ${oldArchives.length} archives to clean up`);

    // Process each archive
    for (const archive of oldArchives) {
      try {
        // Delete file from storage
        const { error: storageError } = await supabase.storage
          .from('audit-archives')
          .remove([archive.file_path]);

        if (storageError) {
          logStep(`Storage delete failed for ${archive.file_path}`, storageError);
          stats.errors.push(`Storage delete failed: ${archive.file_path} - ${storageError.message}`);
          // Continue with database deletion anyway
        } else {
          stats.storageFilesDeleted++;
          stats.totalSizeFreedBytes += archive.file_size_bytes || 0;
        }

        // Audit the deletion BEFORE removing the record
        await supabase.rpc('rpc_create_audit_log', {
          p_actor_id: null, // System action
          p_action: 'ARCHIVE_RETENTION_DELETE',
          p_target_table: 'audit_log_archives',
          p_target_id: archive.id,
          p_metadata: {
            file_path: archive.file_path,
            user_id: archive.user_id,
            records_count: archive.records_count,
            file_size_bytes: archive.file_size_bytes,
            created_at: archive.created_at,
            retention_days: retentionDays,
            reason: 'exceeded_retention_period',
          },
          p_user_agent: 'cleanup-audit-archives/cron',
          p_ip_hash: null,
        });

        // Delete record from tracking table
        const { error: deleteError } = await supabase
          .from('audit_log_archives')
          .delete()
          .eq('id', archive.id);

        if (deleteError) {
          logStep(`Database delete failed for ${archive.id}`, deleteError);
          stats.errors.push(`Database delete failed: ${archive.id} - ${deleteError.message}`);
          continue;
        }

        stats.archivesDeleted++;
        stats.deletedArchives.push({
          id: archive.id,
          file_path: archive.file_path,
          created_at: archive.created_at,
          records_count: archive.records_count,
        });

        logStep(`Deleted archive: ${archive.file_path}`);
      } catch (archiveError) {
        const errorMsg = archiveError instanceof Error ? archiveError.message : String(archiveError);
        stats.errors.push(`Archive ${archive.id}: ${errorMsg}`);
        logStep(`Error processing archive ${archive.id}`, { error: errorMsg });
      }
    }

    // Log completion to system_events
    const severity = stats.errors.length > 0 ? 'warn' : 'info';
    await supabase.from('system_events').insert({
      source: 'cleanup-audit-archives',
      severity,
      code: 'CLEANUP_COMPLETE',
      message: `Archive cleanup: ${stats.archivesDeleted} deleted, ${formatBytes(stats.totalSizeFreedBytes)} freed`,
      meta: {
        retention_days: retentionDays,
        cutoff_date: cutoffDateStr,
        archives_deleted: stats.archivesDeleted,
        storage_files_deleted: stats.storageFilesDeleted,
        total_size_freed_bytes: stats.totalSizeFreedBytes,
        error_count: stats.errors.length,
      },
    });

    logStep("Archive cleanup complete", {
      archivesDeleted: stats.archivesDeleted,
      storageFilesDeleted: stats.storageFilesDeleted,
      totalSizeFreed: formatBytes(stats.totalSizeFreedBytes),
      errors: stats.errors.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          ...stats,
          totalSizeFreedFormatted: formatBytes(stats.totalSizeFreedBytes),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
