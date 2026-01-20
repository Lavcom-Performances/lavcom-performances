import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[monthly-compliance-report] ${step}${detailsStr}`);
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

interface BulkVerificationReport {
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

function buildComplianceReportEmail(
  report: BulkVerificationReport,
  periodLabel: string,
  totalStorageBytes: number
): string {
  const integrityScore = report.total_archives > 0 
    ? Math.round((report.verified_valid / report.total_archives) * 100)
    : 100;
  
  const scoreColor = integrityScore >= 95 ? '#22c55e' : integrityScore >= 80 ? '#f59e0b' : '#dc2626';
  const scoreEmoji = integrityScore >= 95 ? '✅' : integrityScore >= 80 ? '⚠️' : '❌';

  const issueDetails = report.results
    .filter(r => r.status !== 'valid')
    .slice(0, 10)
    .map(r => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px; font-family: monospace; font-size: 11px;">${r.file_path}</td>
        <td style="padding: 10px; text-align: center;">
          <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; background: ${
            r.status === 'invalid' ? '#fef2f2' : r.status === 'file_missing' ? '#fffbeb' : '#f3f4f6'
          }; color: ${
            r.status === 'invalid' ? '#dc2626' : r.status === 'file_missing' ? '#f59e0b' : '#6b7280'
          };">${r.status}</span>
        </td>
        <td style="padding: 10px; color: #6b7280; font-size: 11px;">${r.message}</td>
      </tr>
    `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Monthly Compliance Report</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📊 Monthly Compliance Report</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${periodLabel}</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Integrity Score -->
        <div style="text-align: center; margin-bottom: 30px; padding: 30px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Archive Integrity Score</div>
          <div style="font-size: 64px; font-weight: bold; color: ${scoreColor};">${integrityScore}%</div>
          <div style="font-size: 24px; margin-top: 5px;">${scoreEmoji}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
            ${integrityScore >= 95 ? 'Excellent - All archives verified successfully' : 
              integrityScore >= 80 ? 'Good - Minor issues detected' : 
              'Action Required - Significant issues found'}
          </div>
        </div>

        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #22c55e;">${report.verified_valid}</div>
            <div style="font-size: 12px; color: #166534;">Valid Archives</div>
          </div>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${report.verified_invalid + report.file_missing}</div>
            <div style="font-size: 12px; color: #991b1b;">Issues Found</div>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${report.total_archives}</div>
            <div style="font-size: 12px; color: #1e40af;">Total Verified</div>
          </div>
        </div>

        <!-- Detailed Stats -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background: #f8fafc;">
            <td style="padding: 12px; font-weight: 600;">Metric</td>
            <td style="padding: 12px; text-align: right; font-weight: 600;">Value</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px;">✅ Verified Valid</td>
            <td style="padding: 12px; text-align: right; color: #22c55e; font-weight: 600;">${report.verified_valid}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px;">❌ Invalid Checksums</td>
            <td style="padding: 12px; text-align: right; color: #dc2626; font-weight: 600;">${report.verified_invalid}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px;">⚠️ Missing Files</td>
            <td style="padding: 12px; text-align: right; color: #f59e0b; font-weight: 600;">${report.file_missing}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px;">❓ No Checksum</td>
            <td style="padding: 12px; text-align: right; color: #6b7280;">${report.no_checksum}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px;">⚡ Errors</td>
            <td style="padding: 12px; text-align: right; color: #6b7280;">${report.errors}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px;">💾 Total Storage</td>
            <td style="padding: 12px; text-align: right; color: #3b82f6; font-weight: 600;">${formatBytes(totalStorageBytes)}</td>
          </tr>
        </table>

        ${report.verified_invalid + report.file_missing > 0 ? `
        <!-- Issues Table -->
        <h3 style="color: #1f2937; margin-bottom: 15px;">Issues Requiring Attention</h3>
        <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
          <thead>
            <tr style="background: #374151; color: white;">
              <th style="padding: 12px; text-align: left; font-size: 12px;">File Path</th>
              <th style="padding: 12px; text-align: center; font-size: 12px;">Status</th>
              <th style="padding: 12px; text-align: left; font-size: 12px;">Details</th>
            </tr>
          </thead>
          <tbody>
            ${issueDetails}
          </tbody>
        </table>
        ${report.verified_invalid + report.file_missing > 10 ? `
          <p style="text-align: center; color: #6b7280; font-size: 12px;">
            Showing first 10 of ${report.verified_invalid + report.file_missing} issues
          </p>
        ` : ''}
        ` : ''}

        <!-- Compliance Notice -->
        <div style="margin-top: 30px; padding: 20px; background: ${integrityScore >= 95 ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; border-left: 4px solid ${integrityScore >= 95 ? '#22c55e' : '#dc2626'};">
          <h3 style="color: ${integrityScore >= 95 ? '#166534' : '#991b1b'}; margin: 0 0 10px 0;">
            ${integrityScore >= 95 ? '✅ Compliance Status: Satisfactory' : '⚠️ Compliance Status: Action Required'}
          </h3>
          <p style="color: ${integrityScore >= 95 ? '#15803d' : '#7f1d1d'}; margin: 0; font-size: 14px;">
            ${integrityScore >= 95 
              ? 'All audit log archives have been verified and maintain data integrity. Your organization meets compliance requirements for audit log retention.'
              : 'Some archives have integrity issues that may affect compliance. Please review and address the issues listed above to maintain audit trail integrity.'}
          </p>
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Report generated at ${new Date(report.generated_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
          <p>Verification period: ${report.date_range_start} to ${report.date_range_end}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Starting monthly compliance report generation");

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date range for last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    const date_from = lastMonth.toISOString().split('T')[0];
    const date_to = lastMonthEnd.toISOString().split('T')[0];
    const periodLabel = lastMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    logStep(`Generating report for ${periodLabel}`, { date_from, date_to });

    // Fetch all archives from last month
    const { data: archives, error: fetchError } = await supabase
      .from('audit_log_archives')
      .select('*')
      .gte('created_at', `${date_from}T00:00:00Z`)
      .lte('created_at', `${date_to}T23:59:59Z`)
      .order('created_at', { ascending: true });

    if (fetchError) {
      logStep("Error fetching archives", fetchError);
      throw fetchError;
    }

    const results: VerificationResult[] = [];
    let verified_valid = 0;
    let verified_invalid = 0;
    let no_checksum = 0;
    let file_missing = 0;
    let errors = 0;
    let totalStorageBytes = 0;

    if (archives && archives.length > 0) {
      logStep(`Found ${archives.length} archives to verify`);

      for (const archive of archives) {
        totalStorageBytes += archive.file_size_bytes || 0;
        
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
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          result.status = 'error';
          result.message = `Error during verification: ${errorMsg}`;
          errors++;
        }

        results.push(result);
      }
    }

    const report: BulkVerificationReport = {
      generated_at: new Date().toISOString(),
      date_range_start: date_from,
      date_range_end: date_to,
      total_archives: archives?.length || 0,
      verified_valid,
      verified_invalid,
      no_checksum,
      file_missing,
      errors,
      results,
    };

    logStep("Verification complete", {
      total: report.total_archives,
      valid: verified_valid,
      invalid: verified_invalid,
      file_missing,
      storage: formatBytes(totalStorageBytes),
    });

    // Send email report to platform admins
    let emailsSent = 0;
    if (resendApiKey) {
      const { data: platformAdmins } = await supabase
        .from('platform_roles')
        .select('user_id')
        .in('role', ['super_admin', 'admin']);

      if (platformAdmins && platformAdmins.length > 0) {
        const adminUserIds = platformAdmins.map(a => a.user_id);
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('email')
          .in('id', adminUserIds);

        if (adminProfiles && adminProfiles.length > 0) {
          const recipientEmails = adminProfiles.map(p => p.email).filter(Boolean);
          
          if (recipientEmails.length > 0) {
            const resend = new Resend(resendApiKey);
            const integrityScore = report.total_archives > 0 
              ? Math.round((report.verified_valid / report.total_archives) * 100)
              : 100;
            
            const statusEmoji = integrityScore >= 95 ? '✅' : integrityScore >= 80 ? '⚠️' : '❌';

            try {
              await resend.emails.send({
                from: 'LavAlerte <reports@resend.dev>',
                to: recipientEmails,
                subject: `${statusEmoji} Monthly Compliance Report - ${periodLabel} (${integrityScore}% integrity)`,
                html: buildComplianceReportEmail(report, periodLabel, totalStorageBytes),
              });
              emailsSent = recipientEmails.length;
              logStep(`Compliance report sent to ${emailsSent} admin(s)`);
            } catch (emailErr) {
              logStep("Failed to send compliance report email", emailErr);
            }
          }
        }
      }
    } else {
      logStep("No RESEND_API_KEY configured, skipping email");
    }

    // Log to system_events
    await supabase.from('system_events').insert({
      source: 'monthly-compliance-report',
      severity: verified_invalid > 0 || file_missing > 0 ? 'warn' : 'info',
      code: 'MONTHLY_COMPLIANCE_REPORT',
      message: `Monthly compliance report: ${verified_valid} valid, ${verified_invalid} invalid, ${file_missing} missing`,
      meta: {
        period: periodLabel,
        date_from,
        date_to,
        total_archives: report.total_archives,
        verified_valid,
        verified_invalid,
        no_checksum,
        file_missing,
        errors,
        total_storage_bytes: totalStorageBytes,
        emails_sent: emailsSent,
      },
    });

    // Log to audit_logs
    await supabase.rpc('rpc_create_audit_log', {
      p_actor_id: null,
      p_action: 'MONTHLY_COMPLIANCE_REPORT',
      p_target_table: 'audit_log_archives',
      p_target_id: null,
      p_metadata: {
        period: periodLabel,
        total_archives: report.total_archives,
        integrity_score: report.total_archives > 0 
          ? Math.round((report.verified_valid / report.total_archives) * 100)
          : 100,
        emails_sent: emailsSent,
      },
      p_user_agent: 'monthly-compliance-report',
      p_ip_hash: null,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        report,
        emails_sent: emailsSent,
        period: periodLabel,
        total_storage_bytes: totalStorageBytes,
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
