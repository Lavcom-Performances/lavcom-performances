import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VerifyOtpRequest {
  device_id: string;
  code: string;
  device_name?: string;
}

const MAX_ATTEMPTS = 5;
const TRUST_DURATION_DAYS = 30;

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

    const body: VerifyOtpRequest = await req.json();
    
    if (!body.device_id || !body.code) {
      return new Response(
        JSON.stringify({ error: 'Missing device_id or code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deviceId = body.device_id.slice(0, 64);
    const code = body.code.replace(/\D/g, '').slice(0, 6);
    const deviceName = body.device_name?.slice(0, 100) || null;

    if (code.length !== 6) {
      return new Response(
        JSON.stringify({ error: 'Invalid code format', code: 'INVALID_FORMAT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find the OTP record
    const { data: otpRecord, error: otpError } = await serviceClient
      .from('auth_login_otps')
      .select('*')
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error('[verify-login-otp] Query error:', otpError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ 
          error: 'Code expired or not found. Please request a new code.',
          code: 'OTP_NOT_FOUND',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      // Delete the OTP
      await serviceClient.from('auth_login_otps').delete().eq('id', otpRecord.id);
      
      return new Response(
        JSON.stringify({ 
          error: 'Too many failed attempts. Please request a new code.',
          code: 'MAX_ATTEMPTS_EXCEEDED',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the code
    const codeHash = await hashString(code);
    
    if (codeHash !== otpRecord.code_hash) {
      // Increment attempts
      await serviceClient
        .from('auth_login_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remainingAttempts = MAX_ATTEMPTS - otpRecord.attempts - 1;

      // Log failed attempt
      await serviceClient.rpc('rpc_log_system_event', {
        p_env: 'prod',
        p_source: 'login_otp',
        p_severity: 'warn',
        p_code: 'LOGIN_OTP_FAILED',
        p_message: 'Invalid OTP code entered',
        p_meta: {
          user_id: user.id,
          device_id: deviceId,
          attempts: otpRecord.attempts + 1,
        },
      });

      return new Response(
        JSON.stringify({ 
          error: 'Invalid code. Please try again.',
          code: 'INVALID_CODE',
          remaining_attempts: remainingAttempts,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Code is valid - mark as verified
    await serviceClient
      .from('auth_login_otps')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpRecord.id);

    // Trust the device for 30 days
    const trustedUntil = new Date(Date.now() + TRUST_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await serviceClient.from('trusted_devices').upsert({
      user_id: user.id,
      device_id: deviceId,
      device_name: deviceName,
      trusted_until: trustedUntil,
      last_used_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,device_id',
    });

    // Log success
    await serviceClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'TRUSTED_DEVICE_ADDED',
      target_table: 'trusted_devices',
      metadata: {
        device_id: deviceId,
        device_name: deviceName,
        trusted_until: trustedUntil,
        verified_via: 'email_otp',
      },
    });

    await serviceClient.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'login_otp',
      p_severity: 'info',
      p_code: 'LOGIN_OTP_VERIFIED',
      p_message: 'Login OTP verified, device trusted',
      p_meta: {
        user_id: user.id,
        user_email: user.email,
        device_id: deviceId,
        trusted_until: trustedUntil,
      },
    });

    console.log(`[verify-login-otp] Device ${deviceId} trusted for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Device verified and trusted',
        trusted_until: trustedUntil,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-login-otp] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
