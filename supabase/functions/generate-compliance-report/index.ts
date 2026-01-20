import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[generate-compliance-report] ${step}${detailsStr}`);
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
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'valid': return '#22c55e';
    case 'invalid': return '#ef4444';
    case 'no_checksum': return '#f59e0b';
    case 'file_missing': return '#ef4444';
    default: return '#6b7280';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'valid': return '✓ Valid';
    case 'invalid': return '✗ Invalid';
    case 'no_checksum': return '⚠ No Checksum';
    case 'file_missing': return '✗ Missing';
    default: return '? Error';
  }
}

function generateEmailHtml(
  report: BulkVerificationReport,
  integrityScore: number,
  periodLabel: string,
  totalStorageBytes: number,
  adminName: string
): string {
  const scoreColor = integrityScore >= 90 ? '#22c55e' : integrityScore >= 70 ? '#f59e0b' : '#ef4444';
  
  const resultsRows = report.results.slice(0, 20).map(r => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px; font-size: 12px;">${r.date_range_start}</td>
      <td style="padding: 8px; font-size: 12px;">${r.records_count}</td>
      <td style="padding: 8px; font-size: 12px;">${r.file_size_bytes ? formatBytes(r.file_size_bytes) : 'N/A'}</td>
      <td style="padding: 8px;"><span style="color: ${getStatusColor(r.status)}; font-weight: 600; font-size: 12px;">${getStatusLabel(r.status)}</span></td>
    </tr>
  `).join('');

  const additionalNote = report.results.length > 20 
    ? `<p style="color: #6b7280; font-size: 12px; margin-top: 8px;">... and ${report.results.length - 20} more archives. View full report in the admin panel.</p>` 
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3D4B7A 0%, #5C6B9A 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">📋 Compliance Report</h1>
      <p style="color: #A8B4D0; margin: 8px 0 0 0; font-size: 14px;">${periodLabel}</p>
    </div>
    
    <!-- Summary -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px 0;">Hello ${adminName},</p>
      <p style="margin: 0 0 24px 0;">Your compliance report has been generated. Here's a summary of the archive integrity verification:</p>
      
      <!-- Score Card -->
      <div style="background: #f9fafb; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; font-weight: 700; color: ${scoreColor};">${integrityScore}%</div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Integrity Score</div>
      </div>
      
      <!-- Stats Grid -->
      <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; min-width: 140px; background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 600; color: #22c55e;">${report.verified_valid}</div>
          <div style="font-size: 12px; color: #6b7280;">Valid</div>
        </div>
        <div style="flex: 1; min-width: 140px; background: #fef2f2; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 600; color: #ef4444;">${report.verified_invalid}</div>
          <div style="font-size: 12px; color: #6b7280;">Invalid</div>
        </div>
        <div style="flex: 1; min-width: 140px; background: #fffbeb; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 600; color: #f59e0b;">${report.no_checksum}</div>
          <div style="font-size: 12px; color: #6b7280;">No Checksum</div>
        </div>
        <div style="flex: 1; min-width: 140px; background: #fef2f2; border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 600; color: #ef4444;">${report.file_missing}</div>
          <div style="font-size: 12px; color: #6b7280;">Missing</div>
        </div>
      </div>
      
      <!-- Additional Info -->
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280; font-size: 14px;">Total Archives:</span>
          <span style="font-weight: 600; font-size: 14px;">${report.total_archives}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280; font-size: 14px;">Total Storage:</span>
          <span style="font-weight: 600; font-size: 14px;">${formatBytes(totalStorageBytes)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280; font-size: 14px;">Generated At:</span>
          <span style="font-weight: 600; font-size: 14px;">${new Date(report.generated_at).toLocaleString('fr-FR')}</span>
        </div>
      </div>
      
      <!-- Results Table -->
      ${report.results.length > 0 ? `
      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Archive Details</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280;">Date</th>
            <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280;">Records</th>
            <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280;">Size</th>
            <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${resultsRows}
        </tbody>
      </table>
      ${additionalNote}
      ` : '<p style="color: #6b7280;">No archives found in the specified date range.</p>'}
      
      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This report was generated automatically by LAVCOM Performances admin system.
          <br>You can view the full report and download PDF in the admin panel.
        </p>
      </div>
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

  logStep("Starting manual compliance report generation");

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is platform admin
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: platformRole } = await supabaseAdmin
      .from('platform_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'admin'])
      .single();

    if (!platformRole) {
      throw new Error('Access denied - platform admin required');
    }

    // Get admin profile for email
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const adminName = adminProfile?.first_name 
      ? `${adminProfile.first_name} ${adminProfile.last_name || ''}`.trim()
      : 'Admin';
    const adminEmail = adminProfile?.email || user.email;

    // Parse request body
    const body = await req.json();
    const { date_from, date_to, report_type = 'manual', send_email = true } = body;

    if (!date_from || !date_to) {
      throw new Error('Missing date_from or date_to');
    }

    const periodLabel = `${new Date(date_from).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(date_to).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    logStep(`Generating report for ${periodLabel}`, { date_from, date_to, report_type });

    // Fetch archives in date range
    const { data: archives, error: fetchError } = await supabaseAdmin
      .from('audit_log_archives')
      .select('*')
      .gte('created_at', date_from)
      .lte('created_at', date_to)
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

          const { data: fileData, error: downloadError } = await supabaseAdmin.storage
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

    const integrityScore = archives && archives.length > 0
      ? Math.round((verified_valid / archives.length) * 100)
      : 100;

    const report: BulkVerificationReport = {
      generated_at: new Date().toISOString(),
      date_range_start: date_from.split('T')[0],
      date_range_end: date_to.split('T')[0],
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
      integrity_score: integrityScore,
    });

    // Prepare report JSON for storage
    const reportJson = JSON.stringify({
      ...report,
      integrity_score: integrityScore,
      period_label: periodLabel,
      total_storage_bytes: totalStorageBytes,
    }, null, 2);

    // Compute checksum for tamper detection
    const encoder = new TextEncoder();
    const reportData = encoder.encode(reportJson);
    const reportChecksum = await computeSha256(reportData.buffer as ArrayBuffer);

    // Generate file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `${report_type}/${date_from.split('T')[0]}_${date_to.split('T')[0]}_${timestamp}.json`;

    logStep("Saving report file to storage", { filePath, checksum: reportChecksum });

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('compliance-reports')
      .upload(filePath, new Blob([reportJson], { type: 'application/json' }), {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      logStep("Warning: Failed to upload report file", uploadError);
    }

    // Save report to database with file_path and checksum
    const { data: savedReport, error: saveError } = await supabaseAdmin
      .from('compliance_reports')
      .insert({
        period_label: periodLabel,
        date_range_start: date_from.split('T')[0],
        date_range_end: date_to.split('T')[0],
        total_archives: report.total_archives,
        verified_valid,
        verified_invalid,
        no_checksum,
        file_missing,
        errors,
        integrity_score: integrityScore,
        total_storage_bytes: totalStorageBytes,
        generated_by: user.id,
        report_type,
        report_data: results,
        file_path: uploadError ? null : filePath,
        sha256_checksum: uploadError ? null : reportChecksum,
      })
      .select()
      .single();

    if (saveError) {
      logStep("Warning: Failed to save report to database", saveError);
    } else {
      logStep("Report saved to database", { id: savedReport?.id, file_path: filePath });
    }

    // Log to audit_logs
    await supabaseAdmin.rpc('rpc_create_audit_log', {
      p_actor_id: user.id,
      p_action: 'MANUAL_COMPLIANCE_REPORT',
      p_target_table: 'compliance_reports',
      p_target_id: savedReport?.id || null,
      p_metadata: {
        period_label: periodLabel,
        total_archives: report.total_archives,
        integrity_score: integrityScore,
        report_type,
      },
      p_user_agent: req.headers.get('user-agent'),
      p_ip_hash: null,
    });

    // Send email notification if enabled and Resend is configured
    let emailSent = false;
    if (send_email && resendApiKey && adminEmail) {
      try {
        logStep("Sending email notification", { to: adminEmail });
        
        const resend = new Resend(resendApiKey);
        const emailHtml = generateEmailHtml(report, integrityScore, periodLabel, totalStorageBytes, adminName);
        
        const emailResult = await resend.emails.send({
          from: `LAVCOM Admin <${resendFromEmail}>`,
          to: [adminEmail],
          subject: `📋 Compliance Report: ${periodLabel} (${integrityScore}% Integrity)`,
          html: emailHtml,
        });

        logStep("Email sent successfully", emailResult);
        emailSent = true;
      } catch (emailError) {
        logStep("Warning: Failed to send email notification", emailError);
        // Don't fail the whole request if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        report: {
          ...report,
          integrity_score: integrityScore,
          period_label: periodLabel,
        },
        saved_report_id: savedReport?.id,
        total_storage_bytes: totalStorageBytes,
        email_sent: emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error generating compliance report", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
