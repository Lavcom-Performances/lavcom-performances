import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RevokeSessionsRequest {
  current_device_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RevokeSessionsRequest = await req.json();
    const currentDeviceId = body.current_device_id?.slice(0, 64);

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get count of trusted devices to remove
    const { data: trustedDevices } = await serviceClient
      .from('trusted_devices')
      .select('id, device_id')
      .eq('user_id', user.id)
      .neq('device_id', currentDeviceId || '');

    const removedCount = trustedDevices?.length || 0;

    // Remove all trusted devices except current
    if (currentDeviceId) {
      await serviceClient
        .from('trusted_devices')
        .delete()
        .eq('user_id', user.id)
        .neq('device_id', currentDeviceId);
    } else {
      // If no current device ID provided, remove all
      await serviceClient
        .from('trusted_devices')
        .delete()
        .eq('user_id', user.id);
    }

    // Use Supabase Admin API to sign out all other sessions
    // Note: This uses the admin.auth.admin API to invalidate refresh tokens
    const { error: signOutError } = await serviceClient.auth.admin.signOut(
      user.id,
      'others' // Sign out all sessions except current
    );

    if (signOutError) {
      console.error('[revoke-other-sessions] Sign out error:', signOutError);
      // Continue anyway - trusted devices have been removed
    }

    // Log the action
    await serviceClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'LOGOUT_OTHER_SESSIONS',
      target_table: 'trusted_devices',
      metadata: {
        devices_removed: removedCount,
        current_device_kept: currentDeviceId || null,
      },
    });

    await serviceClient.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'session_management',
      p_severity: 'info',
      p_code: 'LOGOUT_OTHER_SESSIONS',
      p_message: `User logged out ${removedCount} other sessions`,
      p_meta: {
        user_id: user.id,
        user_email: user.email,
        devices_removed: removedCount,
      },
    });

    console.log(`[revoke-other-sessions] User ${user.id} revoked ${removedCount} other sessions`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Other sessions have been logged out',
        devices_removed: removedCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[revoke-other-sessions] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
