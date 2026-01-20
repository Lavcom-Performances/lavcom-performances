import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Compute SHA256 checksum of file content
async function computeSha256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    const { date_from, date_to, limit = 50 } = body;

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
