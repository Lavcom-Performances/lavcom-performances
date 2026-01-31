import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VerifyRequest {
  action: string;
  code: string;
  challenge_id?: string;
}

interface VerifyResponse {
  success: boolean;
  error?: string;
  expires_at?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Parse request
    const body: VerifyRequest = await req.json();
    const { action, code, challenge_id } = body;

    if (!action || !code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get MFA factors
    const { data: mfaData, error: mfaError } = await userClient.auth.mfa.listFactors();
    
    if (mfaError) {
      console.error('Error listing MFA factors:', mfaError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to get MFA factors' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifiedFactor = mfaData.totp.find(f => f.status === 'verified');
    
    if (!verifiedFactor) {
      return new Response(
        JSON.stringify({ success: false, error: 'No MFA factor enrolled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create MFA challenge
    const { data: challengeData, error: challengeError } = await userClient.auth.mfa.challenge({
      factorId: verifiedFactor.id,
    });

    if (challengeError) {
      console.error('Error creating MFA challenge:', challengeError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create MFA challenge' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the TOTP code
    const { error: verifyError } = await userClient.auth.mfa.verify({
      factorId: verifiedFactor.id,
      challengeId: challengeData.id,
      code,
    });

    const ipHash = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = req.headers.get('user-agent')?.substring(0, 500) || '';
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    if (verifyError) {
      console.log(`[verify-mfa] Verification failed for user ${userId}, action ${action}:`, verifyError.message);
      
      // Log failed attempt
      await serviceClient.rpc('rpc_record_mfa_event', {
        p_event_type: 'MFA_CHALLENGE_FAILED',
        p_action: action,
        p_success: false,
        p_ip_hash: ipHash,
        p_user_agent: userAgent,
      });

      return new Response(
        JSON.stringify({ success: false, error: verifyError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verification successful - create or update MFA session
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    if (challenge_id) {
      // Update existing challenge record
      await serviceClient
        .from('mfa_challenges')
        .update({
          verified_at: new Date().toISOString(),
          expires_at: expiresAt,
        })
        .eq('id', challenge_id)
        .eq('user_id', userId);
    } else {
      // Create new verified session
      await serviceClient
        .from('mfa_challenges')
        .insert({
          user_id: userId,
          action,
          verified_at: new Date().toISOString(),
          expires_at: expiresAt,
          ip_hash: ipHash,
          user_agent: userAgent,
        });
    }

    // Log successful verification
    await serviceClient.rpc('rpc_record_mfa_event', {
      p_event_type: 'MFA_CHALLENGE_VERIFIED',
      p_action: action,
      p_success: true,
      p_ip_hash: ipHash,
      p_user_agent: userAgent,
    });

    console.log(`[verify-mfa] User ${userId} verified for action ${action}`);

    return new Response(
      JSON.stringify({
        success: true,
        expires_at: expiresAt,
      } as VerifyResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-mfa] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
