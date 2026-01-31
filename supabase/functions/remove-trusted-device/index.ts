import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RemoveDeviceRequest {
  device_id: string;
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

    const body: RemoveDeviceRequest = await req.json();
    
    if (!body.device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing device_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deviceId = body.device_id.slice(0, 64);
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete the trusted device
    const { error: deleteError } = await serviceClient
      .from('trusted_devices')
      .delete()
      .eq('user_id', user.id)
      .eq('device_id', deviceId);

    if (deleteError) {
      console.error('[remove-trusted-device] Delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to remove device' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await serviceClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'TRUSTED_DEVICE_REMOVED',
      target_table: 'trusted_devices',
      metadata: {
        device_id: deviceId,
      },
    });

    await serviceClient.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'session_management',
      p_severity: 'info',
      p_code: 'TRUSTED_DEVICE_REMOVED',
      p_message: 'Trusted device removed',
      p_meta: {
        user_id: user.id,
        device_id: deviceId,
      },
    });

    console.log(`[remove-trusted-device] Device ${deviceId} removed for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Device removed successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[remove-trusted-device] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
