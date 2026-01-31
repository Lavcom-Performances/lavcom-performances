import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertPlatformMfaOr403 } from "../_shared/mfa.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface StartImpersonationRequest {
  target_user_id: string;
  reason: string;
  ticket_id?: string;
}

const MAX_SESSIONS_PER_DAY = 10;
const SESSION_DURATION_MINUTES = 30;

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
    // TAEX-231: Enforce MFA for platform admins
    const mfaCheck = await assertPlatformMfaOr403(req, 'impersonate_user');
    if (!mfaCheck.allowed) {
      return mfaCheck.response!;
    }

    const adminUserId = mfaCheck.userId!;
    const adminUserEmail = mfaCheck.userEmail;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Service client for privileged operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if admin is super_admin (already verified as platform admin by MFA check)
    const { data: roleData } = await serviceClient
      .from('platform_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleData) {
      console.warn(`[start-impersonation] Non-super_admin attempted impersonation: ${adminUserEmail}`);
      return new Response(JSON.stringify({ error: 'Only super_admin can impersonate users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: StartImpersonationRequest = await req.json();
    const { target_user_id, reason, ticket_id } = body;

    // Validate inputs
    if (!target_user_id || typeof target_user_id !== 'string') {
      return new Response(JSON.stringify({ error: 'target_user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'reason must be at least 10 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent impersonating self
    if (target_user_id === adminUserId) {
      return new Response(JSON.stringify({ error: 'Cannot impersonate yourself' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if target user exists
    const { data: targetProfile, error: targetError } = await serviceClient
      .from('profiles')
      .select('id, email')
      .eq('id', target_user_id)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return new Response(JSON.stringify({ error: 'Target user not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent impersonating super_admin accounts
    const { data: targetRole } = await serviceClient
      .from('platform_roles')
      .select('role')
      .eq('user_id', target_user_id)
      .in('role', ['super_admin', 'admin'])
      .maybeSingle();

    if (targetRole) {
      console.warn(`[start-impersonation] Attempted to impersonate admin: ${target_user_id}`);
      return new Response(JSON.stringify({ error: 'Cannot impersonate platform admin accounts' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit: max 10 sessions/day per admin
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount } = await serviceClient
      .from('impersonation_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', adminUserId)
      .gte('created_at', todayStart.toISOString());

    if ((todayCount ?? 0) >= MAX_SESSIONS_PER_DAY) {
      return new Response(JSON.stringify({ 
        error: `Rate limit exceeded: max ${MAX_SESSIONS_PER_DAY} impersonation sessions per day` 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing active session
    const { data: existingSession } = await serviceClient
      .from('impersonation_sessions')
      .select('id')
      .eq('admin_id', adminUserId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingSession) {
      return new Response(JSON.stringify({ error: 'An active impersonation session already exists. End it first.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create impersonation session
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000);

    const { data: session, error: insertError } = await serviceClient
      .from('impersonation_sessions')
      .insert({
        admin_id: adminUserId,
        target_user_id,
        reason: reason.trim(),
        ticket_id: ticket_id?.trim() || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[start-impersonation] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create impersonation session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log to audit_logs
    await serviceClient.rpc('rpc_create_audit_log', {
      p_actor_id: adminUserId,
      p_action: 'IMPERSONATION_START',
      p_target_table: 'impersonation_sessions',
      p_target_id: session.id,
      p_metadata: {
        target_user_id,
        target_email: targetProfile.email,
        reason: reason.trim(),
        ticket_id: ticket_id?.trim() || null,
        expires_at: expiresAt.toISOString(),
        admin_email: adminUserEmail,
      },
      p_user_agent: req.headers.get('user-agent'),
      p_ip_hash: null,
    });

    // Log to system_events
    await serviceClient.from('system_events').insert({
      env: 'prod',
      source: 'start-impersonation',
      severity: 'warn',
      code: 'IMPERSONATION_STARTED',
      message: `Super admin ${adminUserEmail} started impersonating ${targetProfile.email}`,
      meta: {
        session_id: session.id,
        admin_id: adminUserId,
        target_user_id,
        reason: reason.trim(),
        ticket_id: ticket_id?.trim() || null,
        expires_at: expiresAt.toISOString(),
      },
    });

    console.log(`[start-impersonation] Session started: admin=${adminUserEmail}, target=${targetProfile.email}, session=${session.id}`);

    return new Response(JSON.stringify({
      success: true,
      session_id: session.id,
      target_user_id,
      target_email: targetProfile.email,
      expires_at: expiresAt.toISOString(),
      expires_in_minutes: SESSION_DURATION_MINUTES,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[start-impersonation] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
