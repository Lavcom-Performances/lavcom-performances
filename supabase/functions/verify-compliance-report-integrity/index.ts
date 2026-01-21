import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

// Helper to convert Uint8Array to hex string
function toHexString(arr: Uint8Array): string {
  return Array.from(encodeHex(arr))
    .map(b => String.fromCharCode(b))
    .join('');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Verify compliance report integrity by re-downloading and computing SHA256 checksum
 * 
 * - Only platform admins can verify reports
 * - Downloads the file, computes SHA256, compares to stored checksum
 * - Audits every verification attempt
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check platform admin role
    const { data: platformRole } = await supabaseAdmin
      .from('platform_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'admin'])
      .maybeSingle();

    if (!platformRole) {
      console.warn(`[verify-compliance-report-integrity] Access denied for non-admin user ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Platform admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { report_id } = await req.json();
    
    if (!report_id) {
      return new Response(
        JSON.stringify({ error: 'report_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-compliance-report-integrity] User ${user.id} verifying report ${report_id}`);

    // Fetch report metadata
    const { data: report, error: reportError } = await supabaseAdmin
      .from('compliance_reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      console.error('[verify-compliance-report-integrity] Report not found:', reportError);
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if report has a stored file path
    if (!report.file_path) {
      await supabaseAdmin.rpc('rpc_create_audit_log', {
        p_actor_id: user.id,
        p_action: 'COMPLIANCE_REPORT_VERIFY_NO_FILE',
        p_target_table: 'compliance_reports',
        p_target_id: report_id,
        p_metadata: {
          period_label: report.period_label,
          reason: 'no_stored_file',
        },
        p_user_agent: req.headers.get('user-agent'),
        p_ip_hash: null,
      });

      return new Response(
        JSON.stringify({
          valid: false,
          stored_checksum: null,
          computed_checksum: null,
          message: 'Aucun fichier stocké pour ce rapport (rapport legacy sans fichier)',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if report has a stored checksum
    if (!report.sha256_checksum) {
      await supabaseAdmin.rpc('rpc_create_audit_log', {
        p_actor_id: user.id,
        p_action: 'COMPLIANCE_REPORT_VERIFY_NO_CHECKSUM',
        p_target_table: 'compliance_reports',
        p_target_id: report_id,
        p_metadata: {
          file_path: report.file_path,
          period_label: report.period_label,
          reason: 'no_stored_checksum',
        },
        p_user_agent: req.headers.get('user-agent'),
        p_ip_hash: null,
      });

      return new Response(
        JSON.stringify({
          valid: false,
          stored_checksum: null,
          computed_checksum: null,
          message: 'Aucun checksum stocké pour ce rapport (rapport legacy)',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('compliance-reports')
      .download(report.file_path);

    if (downloadError || !fileData) {
      console.error('[verify-compliance-report-integrity] Download failed:', downloadError);
      
      await supabaseAdmin.rpc('rpc_create_audit_log', {
        p_actor_id: user.id,
        p_action: 'COMPLIANCE_REPORT_VERIFY_DOWNLOAD_FAILED',
        p_target_table: 'compliance_reports',
        p_target_id: report_id,
        p_metadata: {
          file_path: report.file_path,
          period_label: report.period_label,
          error: downloadError?.message,
        },
        p_user_agent: req.headers.get('user-agent'),
        p_ip_hash: null,
      });

      return new Response(
        JSON.stringify({
          valid: false,
          stored_checksum: report.sha256_checksum,
          computed_checksum: null,
          message: 'Impossible de télécharger le fichier pour vérification',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute SHA256 of downloaded file
    const arrayBuffer = await fileData.arrayBuffer();
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', arrayBuffer);
    const computedChecksum = toHexString(new Uint8Array(hashBuffer));

    const isValid = computedChecksum === report.sha256_checksum;

    console.log(`[verify-compliance-report-integrity] Report ${report_id}: stored=${report.sha256_checksum}, computed=${computedChecksum}, valid=${isValid}`);

    // Audit the verification
    await supabaseAdmin.rpc('rpc_create_audit_log', {
      p_actor_id: user.id,
      p_action: isValid ? 'COMPLIANCE_REPORT_VERIFY_SUCCESS' : 'COMPLIANCE_REPORT_VERIFY_MISMATCH',
      p_target_table: 'compliance_reports',
      p_target_id: report_id,
      p_metadata: {
        file_path: report.file_path,
        period_label: report.period_label,
        stored_checksum: report.sha256_checksum,
        computed_checksum: computedChecksum,
        integrity_score: report.integrity_score,
        match: isValid,
      },
      p_user_agent: req.headers.get('user-agent'),
      p_ip_hash: null,
    });

    // Log to system_events
    await supabaseAdmin.from('system_events').insert({
      source: 'compliance_report',
      severity: isValid ? 'info' : 'warn',
      message: isValid 
        ? `Compliance report integrity verified: ${report.period_label}` 
        : `Compliance report integrity MISMATCH: ${report.period_label}`,
      code: isValid ? 'COMPLIANCE_REPORT_INTEGRITY_OK' : 'COMPLIANCE_REPORT_INTEGRITY_MISMATCH',
      meta: {
        report_id,
        user_id: user.id,
        period_label: report.period_label,
        stored_checksum: report.sha256_checksum,
        computed_checksum: computedChecksum,
      },
    });

    return new Response(
      JSON.stringify({
        valid: isValid,
        stored_checksum: report.sha256_checksum,
        computed_checksum: computedChecksum,
        message: isValid 
          ? 'Le fichier est intact - les checksums correspondent' 
          : 'ATTENTION: Les checksums ne correspondent pas - le fichier a peut-être été modifié',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-compliance-report-integrity] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
