import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EndImpersonationRequest {
  session_id: string;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: adminUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service client for privileged operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if admin is super_admin
    const { data: roleData } = await serviceClient
      .from('platform_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Only super_admin can end impersonation sessions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: EndImpersonationRequest = await req.json();
    const { session_id, reason } = body;

    if (!session_id || typeof session_id !== 'string') {
      return new Response(JSON.stringify({ error: 'session_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the session
    const { data: session, error: sessionError } = await serviceClient
      .from('impersonation_sessions')
      .select('*')
      .eq('id', session_id)
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin owns this session
    if (session.admin_id !== adminUser.id) {
      return new Response(JSON.stringify({ error: 'You can only end your own impersonation sessions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already revoked
    if (session.revoked_at) {
      return new Response(JSON.stringify({ error: 'Session already ended' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Revoke the session
    const revokedAt = new Date().toISOString();
    const { error: updateError } = await serviceClient
      .from('impersonation_sessions')
      .update({
        revoked_at: revokedAt,
        revoked_reason: reason || 'Manual exit',
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('[end-impersonation] Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to end impersonation session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get target user email for logging
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('email')
      .eq('id', session.target_user_id)
      .maybeSingle();

    // Log to audit_logs
    await serviceClient.rpc('rpc_create_audit_log', {
      p_actor_id: adminUser.id,
      p_action: 'IMPERSONATION_END',
      p_target_table: 'impersonation_sessions',
      p_target_id: session_id,
      p_metadata: {
        target_user_id: session.target_user_id,
        target_email: targetProfile?.email,
        session_started_at: session.created_at,
        session_ended_at: revokedAt,
        reason: reason || 'Manual exit',
        admin_email: adminUser.email,
      },
      p_user_agent: req.headers.get('user-agent'),
      p_ip_hash: null,
    });

    // Log to system_events
    await serviceClient.from('system_events').insert({
      env: 'prod',
      source: 'end-impersonation',
      severity: 'warn',
      code: 'IMPERSONATION_ENDED',
      message: `Super admin ${adminUser.email} ended impersonation of ${targetProfile?.email || session.target_user_id}`,
      meta: {
        session_id,
        admin_id: adminUser.id,
        target_user_id: session.target_user_id,
        reason: reason || 'Manual exit',
        session_duration_seconds: Math.floor((new Date(revokedAt).getTime() - new Date(session.created_at).getTime()) / 1000),
      },
    });

    console.log(`[end-impersonation] Session ended: session=${session_id}, admin=${adminUser.email}`);

    return new Response(JSON.stringify({
      success: true,
      session_id,
      revoked_at: revokedAt,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[end-impersonation] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
