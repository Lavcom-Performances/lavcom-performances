import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  logStep("Starting manual compliance report generation");

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    // Parse request body
    const body = await req.json();
    const { date_from, date_to, report_type = 'manual' } = body;

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

    // Save report to database
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
      })
      .select()
      .single();

    if (saveError) {
      logStep("Warning: Failed to save report to database", saveError);
    } else {
      logStep("Report saved to database", { id: savedReport?.id });
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
