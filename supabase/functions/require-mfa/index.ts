import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Sensitive actions requiring MFA verification
const SENSITIVE_ACTIONS = {
  // Platform Admin actions (MUST have MFA enrolled)
  platform_admin: [
    'impersonate_user',
    'change_platform_role',
    'toggle_feature_flag',
    'run_dr_drill',
    'generate_compliance_report',
    'download_archive',
    'access_secrets',
    'system_config',
  ],
  // Company Admin / SaaS user actions (flexible MFA)
  company_admin: [
    'export_csv',
    'export_financial',
    'remove_team_member',
    'change_user_role',
    'billing_change',
    'cancel_subscription',
    'change_password',
    'delete_site',
    'delete_account',
    'disable_mfa',
  ],
};

interface MfaCheckRequest {
  action: string;
  create_challenge?: boolean;
}

interface MfaCheckResponse {
  mfa_required: boolean;
  mfa_enrolled: boolean;
  has_valid_session: boolean;
  challenge_id?: string;
  error?: string;
  // New fields for platform admin enforcement
  is_platform_admin?: boolean;
  enrollment_required?: boolean;
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
        JSON.stringify({ error: 'Unauthorized', code: 'MISSING_AUTH' }),
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
        JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    // Parse request
    const body: MfaCheckRequest = await req.json();
    const { action, create_challenge } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is platform admin
    const { data: platformRoleData } = await serviceClient
      .from('platform_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'super_admin'])
      .limit(1);

    const isPlatformAdmin = platformRoleData && platformRoleData.length > 0;
    const isPlatformAdminAction = SENSITIVE_ACTIONS.platform_admin.includes(action);

    // Check if action requires MFA
    const allSensitiveActions = [
      ...SENSITIVE_ACTIONS.platform_admin,
      ...SENSITIVE_ACTIONS.company_admin,
    ];

    const isSensitiveAction = allSensitiveActions.includes(action);
    
    if (!isSensitiveAction) {
      // Action doesn't require MFA
      return new Response(
        JSON.stringify({
          mfa_required: false,
          mfa_enrolled: false,
          has_valid_session: true,
          is_platform_admin: isPlatformAdmin,
        } as MfaCheckResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has MFA enrolled
    const { data: mfaData, error: mfaError } = await userClient.auth.mfa.listFactors();
    
    if (mfaError) {
      console.error('Error checking MFA factors:', mfaError);
      return new Response(
        JSON.stringify({ error: 'Failed to check MFA status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifiedFactor = mfaData.totp.find(f => f.status === 'verified');
    const mfaEnrolled = !!verifiedFactor;

    // TAEX-231: Platform admin enforcement
    // If user is platform admin AND action is a platform admin action AND MFA not enrolled → BLOCK
    if (isPlatformAdmin && isPlatformAdminAction && !mfaEnrolled) {
      console.warn(`[require-mfa] Platform admin ${userEmail} blocked: MFA not enrolled for ${action}`);
      
      // Log the blocked attempt
      await serviceClient.from('system_events').insert({
        env: 'prod',
        source: 'require-mfa',
        severity: 'warn',
        code: 'PLATFORM_MFA_NOT_ENROLLED',
        message: `Platform admin ${userEmail} blocked from ${action}: MFA not enrolled`,
        meta: {
          actor_id: userId,
          actor_email: userEmail,
          action,
          ip_hash: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
        },
      });

      return new Response(
        JSON.stringify({
          mfa_required: true,
          mfa_enrolled: false,
          has_valid_session: false,
          is_platform_admin: true,
          enrollment_required: true,
          error: 'MFA enrollment required for platform administrators',
          message: 'Platform administrators must enable MFA to perform sensitive actions. Please set up MFA in your security settings.',
        } as MfaCheckResponse),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mfaEnrolled) {
      // Non-platform admin without MFA enrolled - allow action but log it
      console.log(`[require-mfa] User ${userId} performing ${action} without MFA enrollment`);
      
      return new Response(
        JSON.stringify({
          mfa_required: true,
          mfa_enrolled: false,
          has_valid_session: true, // Allow since not enrolled (for non-platform users)
          is_platform_admin: isPlatformAdmin,
        } as MfaCheckResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User has MFA enrolled - check for valid session
    const { data: validSession, error: sessionError } = await serviceClient.rpc(
      'has_valid_mfa_session',
      { p_user_id: userId, p_action: action }
    );

    if (sessionError) {
      console.error('Error checking MFA session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to check MFA session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (validSession) {
      // Valid MFA session exists
      return new Response(
        JSON.stringify({
          mfa_required: true,
          mfa_enrolled: true,
          has_valid_session: true,
          is_platform_admin: isPlatformAdmin,
        } as MfaCheckResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No valid session - MFA verification required
    let challengeId: string | undefined;

    if (create_challenge) {
      // Create a pending challenge record
      const ipHash = req.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = req.headers.get('user-agent') || '';

      const { data: challenge, error: challengeError } = await serviceClient
        .from('mfa_challenges')
        .insert({
          user_id: userId,
          action,
          ip_hash: ipHash.split(',')[0].trim(),
          user_agent: userAgent.substring(0, 500),
        })
        .select('id')
        .single();

      if (challengeError) {
        console.error('Error creating challenge:', challengeError);
      } else {
        challengeId = challenge.id;
      }

      // Log the challenge request
      await serviceClient.rpc('rpc_record_mfa_event', {
        p_event_type: 'MFA_CHALLENGE_REQUESTED',
        p_action: action,
        p_success: true,
        p_ip_hash: ipHash.split(',')[0].trim(),
        p_user_agent: userAgent.substring(0, 500),
      });
    }

    return new Response(
      JSON.stringify({
        mfa_required: true,
        mfa_enrolled: true,
        has_valid_session: false,
        challenge_id: challengeId,
        is_platform_admin: isPlatformAdmin,
      } as MfaCheckResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[require-mfa] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
