import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertPlatformMfaOr403 } from "../_shared/mfa.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[get-compliance-report-download-url] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Starting compliance report download URL generation");

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // TAEX-232: Enforce MFA for platform admins
    const mfaCheck = await assertPlatformMfaOr403(req, 'download_archive');
    if (!mfaCheck.allowed) {
      return mfaCheck.response!;
    }

    const userId = mfaCheck.userId!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is platform admin (MFA already verified auth)
    const { data: platformRole } = await supabaseAdmin
      .from('platform_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['super_admin', 'admin'])
      .single();

    if (!platformRole) {
      throw new Error('Access denied - platform admin required');
    }

    // Parse request body
    const body = await req.json();
    const { report_id } = body;

    if (!report_id) {
      throw new Error('Missing report_id');
    }

    logStep("Fetching report", { report_id });

    // Fetch the report to get file_path
    const { data: report, error: reportError } = await supabaseAdmin
      .from('compliance_reports')
      .select('id, file_path, sha256_checksum, period_label, generated_at')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      logStep("Report not found", reportError);
      throw new Error('Report not found');
    }

    if (!report.file_path) {
      throw new Error('Report does not have a stored file');
    }

    logStep("Generating signed URL", { file_path: report.file_path });

    // Generate signed URL (expires in 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('compliance-reports')
      .createSignedUrl(report.file_path, 5 * 60); // 5 minutes

    if (signedUrlError || !signedUrlData?.signedUrl) {
      logStep("Failed to generate signed URL", signedUrlError);
      throw new Error('Failed to generate download URL');
    }

    logStep("Signed URL generated successfully");

    // Log to audit_logs
    await supabaseAdmin.rpc('rpc_create_audit_log', {
      p_actor_id: userId,
      p_action: 'COMPLIANCE_REPORT_DOWNLOAD',
      p_target_table: 'compliance_reports',
      p_target_id: report_id,
      p_metadata: {
        period_label: report.period_label,
        file_path: report.file_path,
        checksum_present: !!report.sha256_checksum,
      },
      p_user_agent: req.headers.get('user-agent'),
      p_ip_hash: null,
    });

    // Log to system_events
    await supabaseAdmin.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'compliance_report',
      p_severity: 'info',
      p_code: 'REPORT_DOWNLOADED',
      p_message: `Compliance report downloaded: ${report.period_label}`,
      p_meta: {
        report_id,
        actor_id: userId,
        generated_at: report.generated_at,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        signed_url: signedUrlData.signedUrl,
        expires_in_seconds: 300,
        checksum: report.sha256_checksum,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error generating download URL", errorMessage);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
