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
 * Verify archive integrity by re-downloading and computing SHA256 checksum
 * 
 * - Only platform admins can verify archives
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
      console.warn(`[verify-archive-integrity] Access denied for non-admin user ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Platform admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { archive_id } = await req.json();
    
    if (!archive_id) {
      return new Response(
        JSON.stringify({ error: 'archive_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-archive-integrity] User ${user.id} verifying archive ${archive_id}`);

    // Fetch archive metadata
    const { data: archive, error: archiveError } = await supabaseAdmin
      .from('audit_log_archives')
      .select('*')
      .eq('id', archive_id)
      .single();

    if (archiveError || !archive) {
      console.error('[verify-archive-integrity] Archive not found:', archiveError);
      return new Response(
        JSON.stringify({ error: 'Archive not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if archive has a stored checksum
    if (!archive.sha256_checksum) {
      // Log verification attempt for archive without checksum
      await supabaseAdmin.rpc('rpc_create_audit_log', {
        p_actor_id: user.id,
        p_action: 'ARCHIVE_VERIFY_NO_CHECKSUM',
        p_target_table: 'audit_log_archives',
        p_target_id: archive_id,
        p_metadata: {
          file_path: archive.file_path,
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
          message: 'Aucun checksum stocké pour cette archive (archive legacy)',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('audit-archives')
      .download(archive.file_path);

    if (downloadError || !fileData) {
      console.error('[verify-archive-integrity] Download failed:', downloadError);
      
      await supabaseAdmin.rpc('rpc_create_audit_log', {
        p_actor_id: user.id,
        p_action: 'ARCHIVE_VERIFY_DOWNLOAD_FAILED',
        p_target_table: 'audit_log_archives',
        p_target_id: archive_id,
        p_metadata: {
          file_path: archive.file_path,
          error: downloadError?.message,
        },
        p_user_agent: req.headers.get('user-agent'),
        p_ip_hash: null,
      });

      return new Response(
        JSON.stringify({
          valid: false,
          stored_checksum: archive.sha256_checksum,
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

    const isValid = computedChecksum === archive.sha256_checksum;

    console.log(`[verify-archive-integrity] Archive ${archive_id}: stored=${archive.sha256_checksum}, computed=${computedChecksum}, valid=${isValid}`);

    // Audit the verification
    await supabaseAdmin.rpc('rpc_create_audit_log', {
      p_actor_id: user.id,
      p_action: isValid ? 'ARCHIVE_VERIFY_SUCCESS' : 'ARCHIVE_VERIFY_MISMATCH',
      p_target_table: 'audit_log_archives',
      p_target_id: archive_id,
      p_metadata: {
        file_path: archive.file_path,
        stored_checksum: archive.sha256_checksum,
        computed_checksum: computedChecksum,
        file_size_bytes: archive.file_size_bytes,
        match: isValid,
      },
      p_user_agent: req.headers.get('user-agent'),
      p_ip_hash: null,
    });

    // Log to system_events
    await supabaseAdmin.from('system_events').insert({
      source: 'audit_archive',
      severity: isValid ? 'info' : 'warn',
      message: isValid 
        ? `Archive integrity verified: ${archive.file_path}` 
        : `Archive integrity MISMATCH: ${archive.file_path}`,
      code: isValid ? 'ARCHIVE_INTEGRITY_OK' : 'ARCHIVE_INTEGRITY_MISMATCH',
      meta: {
        archive_id,
        user_id: user.id,
        stored_checksum: archive.sha256_checksum,
        computed_checksum: computedChecksum,
      },
    });

    return new Response(
      JSON.stringify({
        valid: isValid,
        stored_checksum: archive.sha256_checksum,
        computed_checksum: computedChecksum,
        message: isValid 
          ? 'Le fichier est intact - les checksums correspondent' 
          : 'ATTENTION: Les checksums ne correspondent pas - le fichier a peut-être été modifié',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-archive-integrity] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
