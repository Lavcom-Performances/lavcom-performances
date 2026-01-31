import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LoginEventRequest {
  device_id: string;
  user_agent_hash: string;
  timezone: string;
  locale: string;
}

interface RiskAssessment {
  risk_level: 'low' | 'medium' | 'high';
  reasons: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Parse request body
    const body: LoginEventRequest = await req.json();
    
    if (!body.device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing device_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitize = (str: string | undefined, maxLen: number) => 
      str?.slice(0, maxLen).replace(/[<>]/g, '') || '';

    const deviceId = sanitize(body.device_id, 64);
    const userAgentHash = sanitize(body.user_agent_hash, 64);
    const timezone = sanitize(body.timezone, 50);
    const locale = sanitize(body.locale, 10);

    // Get IP hash from forwarded header (for privacy, we hash it)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor?.split(',')[0].trim() || 'unknown';
    const ipHash = await hashString(clientIp);

    // Get country from CF headers or similar (if available)
    const country = req.headers.get('cf-ipcountry') || 
                   req.headers.get('x-vercel-ip-country') || 
                   null;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if device is trusted
    const { data: trustedDevice } = await serviceClient
      .from('trusted_devices')
      .select('id, trusted_until')
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .gt('trusted_until', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    // If device is trusted, update last_used and return low risk
    if (trustedDevice) {
      await serviceClient
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', trustedDevice.id);

      // Still log the event
      await serviceClient.from('auth_login_events').insert({
        user_id: user.id,
        device_id: deviceId,
        user_agent_hash: userAgentHash,
        ip_hash: ipHash,
        country,
        timezone,
        locale,
        risk_level: 'low',
        risk_reasons: [],
      });

      console.log(`[log-login-event] Trusted device login for user ${user.id}`);

      return new Response(
        JSON.stringify({
          risk_level: 'low',
          reasons: [],
          is_trusted_device: true,
          mfa_enrolled: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assess risk
    const risk = await assessLoginRisk(serviceClient, user.id, deviceId, ipHash, country);

    // Check if user has MFA enrolled
    const { data: mfaData } = await userClient.auth.mfa.listFactors();
    const mfaEnrolled = mfaData?.totp.some(f => f.status === 'verified') || false;

    // Log the event
    await serviceClient.from('auth_login_events').insert({
      user_id: user.id,
      device_id: deviceId,
      user_agent_hash: userAgentHash,
      ip_hash: ipHash,
      country,
      timezone,
      locale,
      risk_level: risk.risk_level,
      risk_reasons: risk.reasons,
    });

    // Log to audit if risky
    if (risk.risk_level !== 'low') {
      await serviceClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'LOGIN_RISK_DETECTED',
        target_table: 'auth_login_events',
        metadata: {
          risk_level: risk.risk_level,
          reasons: risk.reasons,
          device_id: deviceId,
        },
        ip_hash: ipHash,
      });

      // Also log to system_events
      await serviceClient.rpc('rpc_log_system_event', {
        p_env: 'prod',
        p_source: 'login_risk',
        p_severity: risk.risk_level === 'high' ? 'warn' : 'info',
        p_code: 'LOGIN_RISK_DETECTED',
        p_message: `Risky login detected: ${risk.reasons.join(', ')}`,
        p_meta: {
          user_id: user.id,
          user_email: user.email,
          risk_level: risk.risk_level,
          reasons: risk.reasons,
        },
      });
    }

    console.log(`[log-login-event] Risk=${risk.risk_level} for user ${user.id}: ${risk.reasons.join(', ') || 'none'}`);

    return new Response(
      JSON.stringify({
        risk_level: risk.risk_level,
        reasons: risk.reasons,
        is_trusted_device: false,
        mfa_enrolled: mfaEnrolled,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[log-login-event] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper to hash strings for privacy
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Assess login risk based on device history
async function assessLoginRisk(
  serviceClient: any,
  userId: string,
  deviceId: string,
  ipHash: string,
  country: string | null,
): Promise<RiskAssessment> {
  const reasons: string[] = [];

  // Check if device was seen recently (90 days)
  const { data: recentDevice } = await serviceClient
    .from('auth_login_events')
    .select('id')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (!recentDevice || recentDevice.length === 0) {
    reasons.push('NEW_DEVICE');
  }

  // Check for country change
  if (country) {
    const { data: lastLogin } = await serviceClient
      .from('auth_login_events')
      .select('country')
      .eq('user_id', userId)
      .not('country', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLogin?.country && lastLogin.country !== country) {
      reasons.push('NEW_COUNTRY');
    }
  }

  // Check if IP was seen recently (optional, less weight)
  const { data: recentIp } = await serviceClient
    .from('auth_login_events')
    .select('id')
    .eq('user_id', userId)
    .eq('ip_hash', ipHash)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (!recentIp || recentIp.length === 0) {
    // IP not seen recently - add as minor risk factor
    if (reasons.length > 0) {
      reasons.push('NEW_IP');
    }
  }

  // Determine risk level
  let risk_level: 'low' | 'medium' | 'high' = 'low';
  
  if (reasons.includes('NEW_COUNTRY')) {
    risk_level = 'high';
  } else if (reasons.includes('NEW_DEVICE')) {
    risk_level = 'medium';
  }

  return { risk_level, reasons };
}
