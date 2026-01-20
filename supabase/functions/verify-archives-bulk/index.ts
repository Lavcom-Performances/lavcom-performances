import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[verify-archives-bulk] ${step}${detailsStr}`);
};

interface VerificationResult {
  archive_id: string;
  file_path: string;
  date_range_start: string;
  date_range_end: string;
  records_count: number;
  file_size_bytes: number | null;
  stored_checksum: string | null;
  computed_checksum: string | null;
  status: 'valid' | 'invalid' | 'no_checksum' | 'file_missing' | 'error';
  message: string;
}

export interface BulkVerificationReport {
  generated_at: string;
  date_range_start: string;
  date_range_end: string;
  total_archives: number;
  verified_valid: number;
  verified_invalid: number;
  no_checksum: number;
  file_missing: number;
  errors: number;
  results: VerificationResult[];
}

async function computeSha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function buildIntegrityAlertEmail(report: BulkVerificationReport): string {
  const issues = report.results.filter(r => 
    r.status === 'invalid' || r.status === 'file_missing' || r.status === 'error'
  );

  const issueRows = issues.map(issue => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; color: ${issue.status === 'invalid' ? '#dc2626' : issue.status === 'file_missing' ? '#f59e0b' : '#6b7280'};">
        ${issue.status === 'invalid' ? '❌ Invalid' : issue.status === 'file_missing' ? '⚠️ Missing' : '⚡ Error'}
      </td>
      <td style="padding: 12px; font-family: monospace; font-size: 12px;">${issue.file_path}</td>
      <td style="padding: 12px;">${issue.date_range_start} → ${issue.date_range_end}</td>
      <td style="padding: 12px; color: #6b7280; font-size: 12px;">${issue.message}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Archive Integrity Alert</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #f59e0b 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Archive Integrity Alert</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Data integrity issues detected during verification</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${report.verified_invalid}</div>
            <div style="font-size: 12px; color: #991b1b;">Invalid Checksums</div>
          </div>
          <div style="background: #fffbeb; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${report.file_missing}</div>
            <div style="font-size: 12px; color: #92400e;">Missing Files</div>
          </div>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #6b7280;">${report.errors}</div>
            <div style="font-size: 12px; color: #4b5563;">Errors</div>
          </div>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #22c55e;">${report.verified_valid}</div>
            <div style="font-size: 12px; color: #166534;">Valid</div>
          </div>
        </div>

        <h2 style="color: #1f2937; margin-bottom: 15px;">Affected Archives</h2>
        <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #1f2937; color: white;">
              <th style="padding: 12px; text-align: left;">Status</th>
              <th style="padding: 12px; text-align: left;">File Path</th>
              <th style="padding: 12px; text-align: left;">Date Range</th>
              <th style="padding: 12px; text-align: left;">Details</th>
            </tr>
          </thead>
          <tbody>
            ${issueRows}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding: 20px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
          <h3 style="color: #991b1b; margin: 0 0 10px 0;">⚠️ Recommended Actions</h3>
          <ul style="color: #7f1d1d; margin: 0; padding-left: 20px;">
            ${report.verified_invalid > 0 ? '<li>Invalid checksums may indicate data tampering or corruption. Investigate immediately.</li>' : ''}
            ${report.file_missing > 0 ? '<li>Missing files should be restored from backup if available.</li>' : ''}
            <li>Review storage access logs for unauthorized modifications.</li>
            <li>Consider re-archiving affected audit logs if original data is available.</li>
          </ul>
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Generated at ${new Date(report.generated_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
          <p>Date range: ${report.date_range_start} to ${report.date_range_end}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendIntegrityAlertEmail(report: BulkVerificationReport): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    logStep("No RESEND_API_KEY configured, skipping email alert");
    return;
  }

  const hasIssues = report.verified_invalid > 0 || report.file_missing > 0;
  if (!hasIssues) {
    logStep("No integrity issues found, skipping alert email");
    return;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) return;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get platform admin emails
  const { data: platformAdmins } = await supabase
    .from('platform_roles')
    .select('user_id')
    .in('role', ['super_admin', 'admin']);

  if (!platformAdmins || platformAdmins.length === 0) {
    logStep("No platform admins found for email alert");
    return;
  }

  const adminUserIds = platformAdmins.map(a => a.user_id);
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('email')
    .in('id', adminUserIds);

  if (!adminProfiles || adminProfiles.length === 0) {
    logStep("No admin emails found");
    return;
  }

  const recipientEmails = adminProfiles.map(p => p.email).filter(Boolean);
  if (recipientEmails.length === 0) return;

  const resend = new Resend(resendApiKey);
  const issueCount = report.verified_invalid + report.file_missing;

  try {
    await resend.emails.send({
      from: 'LavAlerte <alerts@resend.dev>',
      to: recipientEmails,
      subject: `🚨 Archive Integrity Alert: ${issueCount} issue${issueCount > 1 ? 's' : ''} detected`,
      html: buildIntegrityAlertEmail(report),
    });
    logStep(`Integrity alert sent to ${recipientEmails.length} admin(s)`);
  } catch (err) {
    logStep("Failed to send integrity alert email", err);
  }
}

async function sendSlackIntegrityAlert(report: BulkVerificationReport): Promise<void> {
  const slackWebhook = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!slackWebhook) return;

  const hasIssues = report.verified_invalid > 0 || report.file_missing > 0;
  if (!hasIssues) return;

  const issueCount = report.verified_invalid + report.file_missing;

  try {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *Archive Integrity Alert*`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🚨 Archive Integrity Alert", emoji: true }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${issueCount} data integrity issue${issueCount > 1 ? 's' : ''} detected*\nImmediate investigation required.`
            }
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Invalid Checksums:*\n${report.verified_invalid}` },
              { type: "mrkdwn", text: `*Missing Files:*\n${report.file_missing}` },
              { type: "mrkdwn", text: `*Valid:*\n${report.verified_valid}` },
              { type: "mrkdwn", text: `*Date Range:*\n${report.date_range_start} → ${report.date_range_end}` },
            ]
          },
          {
            type: "context",
            elements: [
              { type: "mrkdwn", text: `Verified at ${new Date(report.generated_at).toISOString()}` }
            ]
          }
        ]
      }),
    });
    logStep("Slack integrity alert sent");
  } catch (err) {
    logStep("Failed to send Slack alert", err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Starting bulk archive verification");

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { date_from, date_to, limit = 50, send_alerts = true } = body;

    if (!date_from || !date_to) {
      return new Response(
        JSON.stringify({ error: 'date_from and date_to are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep(`Verifying archives from ${date_from} to ${date_to}`);

    const { data: archives, error: fetchError } = await supabase
      .from('audit_log_archives')
      .select('*')
      .gte('created_at', date_from)
      .lte('created_at', date_to)
      .order('created_at', { ascending: true })
      .limit(Math.min(limit, 100));

    if (fetchError) {
      logStep("Error fetching archives", fetchError);
      throw fetchError;
    }

    if (!archives || archives.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          report: {
            generated_at: new Date().toISOString(),
            date_range_start: date_from,
            date_range_end: date_to,
            total_archives: 0,
            verified_valid: 0,
            verified_invalid: 0,
            no_checksum: 0,
            file_missing: 0,
            errors: 0,
            results: [],
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep(`Found ${archives.length} archives to verify`);

    const results: VerificationResult[] = [];
    let verified_valid = 0;
    let verified_invalid = 0;
    let no_checksum = 0;
    let file_missing = 0;
    let errors = 0;

    for (const archive of archives) {
      const result: VerificationResult = {
        archive_id: archive.id,
        file_path: archive.file_path,
        date_range_start: archive.date_range_start,
        date_range_end: archive.date_range_end,
        records_count: archive.records_count,
        file_size_bytes: archive.file_size_bytes,
        stored_checksum: archive.sha256_checksum,
        computed_checksum: null,
        status: 'error',
        message: '',
      };

      try {
        if (!archive.sha256_checksum) {
          result.status = 'no_checksum';
          result.message = 'Archive does not have a stored checksum';
          no_checksum++;
          results.push(result);
          continue;
        }

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('audit-archives')
          .download(archive.file_path);

        if (downloadError || !fileData) {
          result.status = 'file_missing';
          result.message = downloadError?.message || 'File not found in storage';
          file_missing++;
          results.push(result);
          logStep(`File missing: ${archive.file_path}`, downloadError);
          continue;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const computedChecksum = await computeSha256(arrayBuffer);
        result.computed_checksum = computedChecksum;

        if (computedChecksum === archive.sha256_checksum) {
          result.status = 'valid';
          result.message = 'Checksum matches - file integrity verified';
          verified_valid++;
        } else {
          result.status = 'invalid';
          result.message = 'Checksum mismatch - file may be corrupted or tampered';
          verified_invalid++;
          logStep(`Checksum mismatch for ${archive.file_path}`, {
            stored: archive.sha256_checksum,
            computed: computedChecksum,
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        result.status = 'error';
        result.message = `Error during verification: ${errorMsg}`;
        errors++;
        logStep(`Error verifying archive ${archive.id}`, err);
      }

      results.push(result);
    }

    const report: BulkVerificationReport = {
      generated_at: new Date().toISOString(),
      date_range_start: date_from,
      date_range_end: date_to,
      total_archives: archives.length,
      verified_valid,
      verified_invalid,
      no_checksum,
      file_missing,
      errors,
      results,
    };

    // Send alerts if issues detected
    if (send_alerts && (verified_invalid > 0 || file_missing > 0)) {
      await Promise.all([
        sendIntegrityAlertEmail(report),
        sendSlackIntegrityAlert(report),
      ]);
    }

    const severity = verified_invalid > 0 || file_missing > 0 ? 'warn' : 'info';
    await supabase.from('system_events').insert({
      source: 'verify-archives-bulk',
      severity,
      code: 'BULK_VERIFICATION_COMPLETE',
      message: `Bulk verification: ${verified_valid} valid, ${verified_invalid} invalid, ${no_checksum} no checksum, ${file_missing} missing`,
      meta: {
        date_from,
        date_to,
        total_archives: archives.length,
        verified_valid,
        verified_invalid,
        no_checksum,
        file_missing,
        errors,
        alerts_sent: send_alerts && (verified_invalid > 0 || file_missing > 0),
      },
    });

    await supabase.rpc('rpc_create_audit_log', {
      p_actor_id: null,
      p_action: 'BULK_ARCHIVE_VERIFICATION',
      p_target_table: 'audit_log_archives',
      p_target_id: null,
      p_metadata: {
        date_from,
        date_to,
        total_archives: archives.length,
        verified_valid,
        verified_invalid,
        no_checksum,
        file_missing,
        errors,
      },
      p_user_agent: 'verify-archives-bulk',
      p_ip_hash: null,
    });

    logStep("Bulk verification complete", {
      total: archives.length,
      valid: verified_valid,
      invalid: verified_invalid,
      no_checksum,
      file_missing,
      errors,
    });

    return new Response(
      JSON.stringify({ success: true, report }),
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
