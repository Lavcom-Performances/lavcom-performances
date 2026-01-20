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

// Send email notification using Resend
async function sendCleanupEmail(
  stats: CleanupStats,
  retentionDays: number,
  isScheduled: boolean
): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@resend.dev';
  const toEmails = Deno.env.get('RESEND_TO_EMAIL');

  if (!resendApiKey || !toEmails) {
    logStep("Email config missing, skipping notification");
    return;
  }

  const recipients = toEmails.split(',').map(e => e.trim()).filter(Boolean);
  if (recipients.length === 0) return;

  const triggerType = isScheduled ? 'Planifié (hebdomadaire)' : 'Manuel';
  const retentionYears = Math.round(retentionDays / 365 * 10) / 10;
  const hasErrors = stats.errors.length > 0;
  const statusEmoji = hasErrors ? '⚠️' : '✅';
  const statusText = hasErrors ? 'avec erreurs' : 'réussi';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0; }
    .stat-card { background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: 700; color: #111827; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-top: 4px; }
    .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .info-label { color: #6b7280; }
    .info-value { font-weight: 500; color: #111827; }
    .error-section { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-top: 20px; }
    .error-title { color: #dc2626; font-weight: 600; margin-bottom: 8px; }
    .footer { text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px; }
    .success-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-size: 13px; }
    .warning-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗂️ Nettoyage des archives d'audit</h1>
    </div>
    <div class="content">
      <p style="margin-top: 0;">
        ${hasErrors ? '<span class="warning-badge">Terminé avec erreurs</span>' : '<span class="success-badge">Terminé avec succès</span>'}
      </p>
      
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.archivesDeleted}</div>
          <div class="stat-label">Archives supprimées</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatBytes(stats.totalSizeFreedBytes)}</div>
          <div class="stat-label">Espace libéré</div>
        </div>
      </div>

      <div class="info-row">
        <span class="info-label">Type d'exécution</span>
        <span class="info-value">${triggerType}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Rétention configurée</span>
        <span class="info-value">${retentionYears} an(s) (${retentionDays} jours)</span>
      </div>
      <div class="info-row" style="border-bottom: none;">
        <span class="info-label">Date d'exécution</span>
        <span class="info-value">${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</span>
      </div>

      ${hasErrors ? `
        <div class="error-section">
          <div class="error-title">⚠️ ${stats.errors.length} erreur(s)</div>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
            ${stats.errors.slice(0, 5).map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="footer">
        <p>Ce message est envoyé automatiquement par le système.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Archives <${fromEmail}>`,
        to: recipients,
        subject: `${statusEmoji} Nettoyage archives ${statusText} - ${stats.archivesDeleted} archive(s) supprimée(s)`,
        html,
      }),
    });

    if (!response.ok) {
      logStep("Email send failed", await response.text());
    } else {
      logStep(`Email sent to ${recipients.length} recipient(s)`);
    }
  } catch (err) {
    logStep("Error sending email", err);
  }
}

// Send Slack notification
async function sendSlackNotification(stats: CleanupStats, retentionDays: number, isScheduled: boolean): Promise<void> {
  const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!slackWebhookUrl) {
    logStep("SLACK_WEBHOOK_URL not configured, skipping");
    return;
  }

  const triggerType = isScheduled ? 'Planifié' : 'Manuel';
  const hasErrors = stats.errors.length > 0;
  const statusEmoji = hasErrors ? '⚠️' : '✅';

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${statusEmoji} Nettoyage des archives d'audit`, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Archives supprimées:*\n${stats.archivesDeleted}` },
        { type: 'mrkdwn', text: `*Espace libéré:*\n${formatBytes(stats.totalSizeFreedBytes)}` },
        { type: 'mrkdwn', text: `*Type:*\n${triggerType}` },
        { type: 'mrkdwn', text: `*Rétention:*\n${Math.round(retentionDays / 365)} an(s)` },
      ],
    },
  ];

  if (hasErrors) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `⚠️ *${stats.errors.length} erreur(s)*` },
    } as typeof blocks[0]);
  }

  try {
    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
    if (!response.ok) {
      logStep("Slack failed", await response.text());
    } else {
      logStep("Slack notification sent");
    }
  } catch (err) {
    logStep("Error sending Slack", err);
  }
}

serve(async (req) => {
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const stats: CleanupStats = {
      archivesDeleted: 0,
      storageFilesDeleted: 0,
      totalSizeFreedBytes: 0,
      errors: [],
      deletedArchives: [],
    };

    let retentionDays = DEFAULT_ARCHIVE_RETENTION_DAYS;
    let isScheduled = true;
    let sendNotifications = true;
    
    try {
      const body = await req.json();
      if (body.retention_days && typeof body.retention_days === 'number') {
        retentionDays = Math.max(MIN_ARCHIVE_RETENTION_DAYS, Math.min(MAX_ARCHIVE_RETENTION_DAYS, body.retention_days));
        logStep(`Using custom retention: ${retentionDays} days`);
      }
      if (body.is_manual === true) isScheduled = false;
      if (body.send_notifications === false) sendNotifications = false;
    } catch {
      // Use defaults
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateStr = cutoffDate.toISOString();

    logStep(`Cleaning archives older than ${retentionDays} days (before ${cutoffDateStr})`);

    const { data: oldArchives, error: fetchError } = await supabase
      .from('audit_log_archives')
      .select('id, file_path, created_at, records_count, file_size_bytes, user_id')
      .lt('created_at', cutoffDateStr)
      .order('created_at', { ascending: true })
      .limit(100);

    if (fetchError) {
      logStep("Error fetching archives", fetchError);
      throw fetchError;
    }

    if (!oldArchives || oldArchives.length === 0) {
      logStep("No archives to clean up");

      await supabase.from('system_events').insert({
        source: 'cleanup-audit-archives',
        severity: 'info',
        code: 'CLEANUP_NOOP',
        message: `No archives older than ${retentionDays} days found`,
        meta: { retention_days: retentionDays, cutoff_date: cutoffDateStr },
      });

      if (sendNotifications && isScheduled) {
        await Promise.all([
          sendCleanupEmail(stats, retentionDays, isScheduled),
          sendSlackNotification(stats, retentionDays, isScheduled),
        ]);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'No archives to clean', stats }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep(`Found ${oldArchives.length} archives to clean up`);

    for (const archive of oldArchives) {
      try {
        const { error: storageError } = await supabase.storage
          .from('audit-archives')
          .remove([archive.file_path]);

        if (storageError) {
          logStep(`Storage delete failed for ${archive.file_path}`, storageError);
          stats.errors.push(`Storage: ${archive.file_path} - ${storageError.message}`);
        } else {
          stats.storageFilesDeleted++;
          stats.totalSizeFreedBytes += archive.file_size_bytes || 0;
        }

        await supabase.rpc('rpc_create_audit_log', {
          p_actor_id: null,
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

        const { error: deleteError } = await supabase
          .from('audit_log_archives')
          .delete()
          .eq('id', archive.id);

        if (deleteError) {
          logStep(`Database delete failed for ${archive.id}`, deleteError);
          stats.errors.push(`DB: ${archive.id} - ${deleteError.message}`);
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
        is_scheduled: isScheduled,
      },
    });

    if (sendNotifications) {
      await Promise.all([
        sendCleanupEmail(stats, retentionDays, isScheduled),
        sendSlackNotification(stats, retentionDays, isScheduled),
      ]);
    }

    logStep("Archive cleanup complete", {
      archivesDeleted: stats.archivesDeleted,
      storageFilesDeleted: stats.storageFilesDeleted,
      totalSizeFreed: formatBytes(stats.totalSizeFreedBytes),
      errors: stats.errors.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        stats: { ...stats, totalSizeFreedFormatted: formatBytes(stats.totalSizeFreedBytes) },
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
