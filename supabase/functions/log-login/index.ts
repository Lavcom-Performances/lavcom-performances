import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginLogRequest {
  user_agent: string;
  browser: string;
  os: string;
  device_type: string;
  device_hash: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[log-login] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT to verify auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user with anon client
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.log('[log-login] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: LoginLogRequest = await req.json();
    
    // Validate required fields
    if (!body.browser || !body.os || !body.device_type || !body.device_hash) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitize = (str: string, maxLen: number) => 
      str?.slice(0, maxLen).replace(/[<>]/g, '') || '';

    const sanitizedData = {
      user_agent: sanitize(body.user_agent, 500),
      browser: sanitize(body.browser, 50),
      os: sanitize(body.os, 50),
      device_type: sanitize(body.device_type, 20),
      device_hash: sanitize(body.device_hash, 64),
    };

    // Use service role client to insert (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this device has been used before
    const { data: existingLogs } = await serviceClient
      .from('login_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('ip_hash', sanitizedData.device_hash)
      .eq('browser', sanitizedData.browser)
      .eq('os', sanitizedData.os)
      .limit(1);

    const isNewDevice = !existingLogs || existingLogs.length === 0;

    // Insert login log using service role
    const { error: insertError } = await serviceClient.from('login_logs').insert({
      user_id: user.id,
      user_agent: sanitizedData.user_agent,
      browser: sanitizedData.browser,
      os: sanitizedData.os,
      device_type: sanitizedData.device_type,
      ip_hash: sanitizedData.device_hash,
      is_new_device: isNewDevice,
    });

    if (insertError) {
      console.error('[log-login] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to log login' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[log-login] Login logged for user (new_device: ${isNewDevice})`);

    return new Response(
      JSON.stringify({ success: true, is_new_device: isNewDevice }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[log-login] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
