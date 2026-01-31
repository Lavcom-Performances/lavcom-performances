import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VerifyRecoveryCodeRequest {
  code: string;
  device_id: string;
  device_name?: string;
}

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

    const body: VerifyRecoveryCodeRequest = await req.json();
    
    if (!body.code || !body.device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing code or device_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize code: remove dashes and convert to uppercase
    const code = body.code.replace(/-/g, '').toUpperCase().slice(0, 8);
    const formattedCode = code.slice(0, 4) + '-' + code.slice(4, 8);
    const deviceId = body.device_id.slice(0, 64);
    const deviceName = body.device_name?.slice(0, 100) || null;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get all unused recovery codes for user
    const { data: recoveryCodes, error: fetchError } = await serviceClient
      .from('recovery_codes')
      .select('id, code_hash')
      .eq('user_id', user.id)
      .is('used_at', null);

    if (fetchError) {
      console.error('[verify-recovery-code] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recoveryCodes || recoveryCodes.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No recovery codes available. Please generate new codes.',
          code: 'NO_CODES_AVAILABLE',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the submitted code and check against stored hashes
    const codeHash = await hashString(formattedCode);
    const matchingCode = recoveryCodes.find(rc => rc.code_hash === codeHash);

    if (!matchingCode) {
      // Log failed attempt
      await serviceClient.rpc('rpc_log_system_event', {
        p_env: 'prod',
        p_source: 'recovery_codes',
        p_severity: 'warn',
        p_code: 'RECOVERY_CODE_FAILED',
        p_message: 'Invalid recovery code entered',
        p_meta: {
          user_id: user.id,
        },
      });

      return new Response(
        JSON.stringify({ 
          error: 'Invalid recovery code',
          code: 'INVALID_CODE',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark code as used
    await serviceClient
      .from('recovery_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', matchingCode.id);

    // Trust the device
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

    // Count remaining codes
    const remainingCodes = recoveryCodes.length - 1;

    // Log success
    await serviceClient.from('audit_logs').insert({
      actor_id: user.id,
      action: 'RECOVERY_CODE_USED',
      target_table: 'recovery_codes',
      metadata: {
        device_id: deviceId,
        remaining_codes: remainingCodes,
      },
    });

    await serviceClient.rpc('rpc_log_system_event', {
      p_env: 'prod',
      p_source: 'recovery_codes',
      p_severity: 'info',
      p_code: 'RECOVERY_CODE_USED',
      p_message: `Recovery code used, ${remainingCodes} remaining`,
      p_meta: {
        user_id: user.id,
        user_email: user.email,
        device_id: deviceId,
        remaining_codes: remainingCodes,
      },
    });

    console.log(`[verify-recovery-code] Code used by user ${user.id}, ${remainingCodes} remaining`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Recovery code verified',
        trusted_until: trustedUntil,
        remaining_codes: remainingCodes,
        warning: remainingCodes <= 2 ? 'You have few recovery codes remaining. Consider generating new ones.' : null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-recovery-code] Error:', error);
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
