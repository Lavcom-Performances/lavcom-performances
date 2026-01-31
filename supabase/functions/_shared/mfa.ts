import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Platform admin actions that require MFA when enrolled
export const PLATFORM_ADMIN_ACTIONS = [
  'impersonate_user',
  'change_platform_role',
  'toggle_feature_flag',
  'run_dr_drill',
  'generate_compliance_report',
  'download_archive',
  'access_secrets',
  'system_config',
] as const;

export type PlatformAdminAction = typeof PLATFORM_ADMIN_ACTIONS[number];

export interface MfaEnforcementResult {
  allowed: boolean;
  response?: Response;
  userId?: string;
  userEmail?: string;
}

/**
 * Check if a user has MFA enrolled (at least one verified TOTP factor)
 */
export async function checkMfaEnrolled(
  userClient: SupabaseClient,
): Promise<{ enrolled: boolean; error?: string }> {
  try {
    const { data: mfaData, error: mfaError } = await userClient.auth.mfa.listFactors();
    
    if (mfaError) {
      console.error('[mfa-check] Error listing MFA factors:', mfaError);
      return { enrolled: false, error: mfaError.message };
    }

    const verifiedFactor = mfaData.totp.find(f => f.status === 'verified');
    return { enrolled: !!verifiedFactor };
  } catch (err) {
    console.error('[mfa-check] Unexpected error:', err);
    return { enrolled: false, error: 'Failed to check MFA status' };
  }
}

/**
 * Check if user has a valid MFA session for the given action
 */
export async function checkMfaSession(
  serviceClient: SupabaseClient,
  userId: string,
  action: string,
): Promise<boolean> {
  const { data: validSession, error } = await serviceClient.rpc(
    'has_valid_mfa_session',
    { p_user_id: userId, p_action: action }
  );

  if (error) {
    console.error('[mfa-check] Error checking MFA session:', error);
    return false;
  }

  return validSession === true;
}

/**
 * Check if user is a platform admin (admin or super_admin role)
 */
export async function isPlatformAdmin(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await serviceClient
    .from('platform_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'super_admin'])
    .limit(1);

  if (error) {
    console.error('[mfa-check] Error checking platform admin:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Assert that platform admin has MFA set up and verified for sensitive actions.
 * 
 * For platform admins:
 * - If MFA not enrolled → 403 with "MFA_ENROLLMENT_REQUIRED"
 * - If MFA enrolled but no valid session → 403 with "MFA_VERIFICATION_REQUIRED"
 * - If MFA session valid → allowed
 * 
 * For non-platform users:
 * - Current flexible behavior (allowed even without MFA)
 * 
 * @param req - The incoming request
 * @param action - The sensitive action being performed
 * @returns MfaEnforcementResult with allowed=true or a 403 response
 */
export async function assertPlatformMfaOr403(
  req: Request,
  action: PlatformAdminAction,
): Promise<MfaEnforcementResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Get auth header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'MISSING_AUTH' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Create clients
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  // Verify user
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Check if user is platform admin
  const isAdmin = await isPlatformAdmin(serviceClient, user.id);
  
  if (!isAdmin) {
    // Non-platform users: flexible behavior (allow action)
    console.log(`[mfa-enforcement] Non-admin user ${user.id} allowed for ${action}`);
    return { allowed: true, userId: user.id, userEmail: user.email };
  }

  // Platform admin: enforce MFA
  console.log(`[mfa-enforcement] Platform admin ${user.email} attempting ${action}`);

  // Check MFA enrollment
  const { enrolled, error: mfaError } = await checkMfaEnrolled(userClient);
  
  if (mfaError) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({ error: 'Failed to check MFA status', code: 'MFA_CHECK_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  if (!enrolled) {
    // Platform admin without MFA enrolled → BLOCK
    console.warn(`[mfa-enforcement] Platform admin ${user.email} blocked: MFA not enrolled`);
    
    // Log the blocked attempt
    await serviceClient.from('system_events').insert({
      env: 'prod',
      source: 'mfa_enforcement',
      severity: 'warn',
      code: 'PLATFORM_MFA_NOT_ENROLLED',
      message: `Platform admin ${user.email} blocked from ${action}: MFA not enrolled`,
      meta: {
        actor_id: user.id,
        actor_email: user.email,
        action,
        ip_hash: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
      },
    });

    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'MFA enrollment required for platform administrators',
          code: 'MFA_ENROLLMENT_REQUIRED',
          action,
          message: 'Platform administrators must enable MFA to perform sensitive actions. Please set up MFA in your security settings.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Check for valid MFA session
  const hasValidSession = await checkMfaSession(serviceClient, user.id, action);
  
  if (!hasValidSession) {
    // MFA enrolled but no valid session → require verification
    console.log(`[mfa-enforcement] Platform admin ${user.email} needs MFA verification for ${action}`);
    
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'MFA verification required',
          code: 'MFA_VERIFICATION_REQUIRED',
          action,
          mfa_enrolled: true,
          message: 'Please verify your identity with MFA to continue.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // MFA session valid → allow
  console.log(`[mfa-enforcement] Platform admin ${user.email} passed MFA check for ${action}`);
  return { allowed: true, userId: user.id, userEmail: user.email };
}

/**
 * Simplified helper for edge functions that just need to enforce MFA for platform admins.
 * Returns the user info if allowed, or sends a 403 response if blocked.
 */
export async function requirePlatformMfa(
  req: Request,
  action: PlatformAdminAction,
): Promise<{ userId: string; userEmail: string } | Response> {
  const result = await assertPlatformMfaOr403(req, action);
  
  if (!result.allowed) {
    return result.response!;
  }
  
  return { userId: result.userId!, userEmail: result.userEmail! };
}
