import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * TAEX-214: Secure signed URL generation for audit archive downloads
 * 
 * - Validates user permissions (platform admin or org member or archive owner)
 * - Generates time-limited signed URL (5 minutes)
 * - Audits every download request
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create service client for admin operations
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

    const { archive_id } = await req.json();
    
    if (!archive_id) {
      return new Response(
        JSON.stringify({ error: 'archive_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-audit-archive-download-url] User ${user.id} requesting archive ${archive_id}`);

    // Fetch archive metadata
    const { data: archive, error: archiveError } = await supabaseAdmin
      .from('audit_log_archives')
      .select('*')
      .eq('id', archive_id)
      .single();

    if (archiveError || !archive) {
      console.error('[get-audit-archive-download-url] Archive not found:', archiveError);
      return new Response(
        JSON.stringify({ error: 'Archive not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine archive scope from file_path
    const pathParts = archive.file_path.split('/');
    const scope = pathParts[0]; // 'platform', 'org', or 'user'
    
    let hasAccess = false;
    let scopeInfo: Record<string, unknown> = { scope };

    if (scope === 'platform') {
      // Only platform admins can access platform archives
      const { data: platformRole } = await supabaseAdmin
        .from('platform_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['super_admin', 'admin'])
        .maybeSingle();

      hasAccess = !!platformRole;
      scopeInfo.platform_role = platformRole?.role || null;
      
    } else if (scope === 'org') {
      // Org members can access their org's archives
      const orgId = pathParts[1];
      const { data: userRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .maybeSingle();

      hasAccess = !!userRole;
      scopeInfo.org_id = orgId;
      scopeInfo.org_role = userRole?.role || null;
      
    } else if (scope === 'user') {
      // Users can only access their own archives
      const archiveUserId = pathParts[1];
      hasAccess = archiveUserId === user.id;
      scopeInfo.archive_owner = archiveUserId;
      
    } else {
      // Legacy format - check if user owns the archive
      hasAccess = archive.user_id === user.id;
      scopeInfo.legacy_owner = archive.user_id;
    }

    if (!hasAccess) {
      console.warn(`[get-audit-archive-download-url] Access denied for user ${user.id} to archive ${archive_id}`);
      
      // Log denied access attempt
      await supabaseAdmin.rpc('rpc_create_audit_log', {
        p_actor_id: user.id,
        p_action: 'ACCESS_DENIED',
        p_target_table: 'audit_log_archives',
        p_target_id: archive_id,
        p_metadata: {
          ...scopeInfo,
          reason: 'insufficient_permissions',
          file_path: archive.file_path,
        },
        p_user_agent: req.headers.get('user-agent'),
        p_ip_hash: null,
      });

      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify checksum exists (light tamper-evidence check)
    if (!archive.sha256_checksum) {
      console.warn(`[get-audit-archive-download-url] Archive ${archive_id} missing checksum - may be legacy`);
    }

    // Generate signed URL (5 minutes expiry)
    const { data: signedUrl, error: signError } = await supabaseAdmin.storage
      .from('audit-archives')
      .createSignedUrl(archive.file_path, 300); // 300 seconds = 5 minutes

    if (signError || !signedUrl) {
      console.error('[get-audit-archive-download-url] Failed to generate signed URL:', signError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate download URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Audit the download request
    await supabaseAdmin.rpc('rpc_create_audit_log', {
      p_actor_id: user.id,
      p_action: 'ARCHIVE_DOWNLOAD',
      p_target_table: 'audit_log_archives',
      p_target_id: archive_id,
      p_metadata: {
        ...scopeInfo,
        file_path: archive.file_path,
        date_range_start: archive.date_range_start,
        date_range_end: archive.date_range_end,
        records_count: archive.records_count,
        file_size_bytes: archive.file_size_bytes,
        has_checksum: !!archive.sha256_checksum,
      },
      p_user_agent: req.headers.get('user-agent'),
      p_ip_hash: null,
    });

    // Log to system_events for monitoring
    await supabaseAdmin.from('system_events').insert({
      source: 'audit_archive',
      severity: 'info',
      message: `Archive download: ${archive.file_path}`,
      code: 'ARCHIVE_DOWNLOADED',
      meta: {
        archive_id,
        user_id: user.id,
        scope,
        records_count: archive.records_count,
        date_range: `${archive.date_range_start} to ${archive.date_range_end}`,
      },
    });

    console.log(`[get-audit-archive-download-url] Signed URL generated for user ${user.id}, archive ${archive_id}`);

    return new Response(
      JSON.stringify({
        signed_url: signedUrl.signedUrl,
        expires_in: 300,
        checksum: archive.sha256_checksum || null,
        file_name: archive.file_path.split('/').pop(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-audit-archive-download-url] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
