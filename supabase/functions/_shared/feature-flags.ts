/**
 * Feature Flags Shared Module - TAEX-223
 * 
 * Server-side enforcement of platform feature flags for Safe Mode kill switches.
 */

export type FeatureFlagKey = 
  | 'imports_enabled'
  | 'ai_enabled'
  | 'exports_enabled'
  | 'stripe_checkout_enabled'
  | 'recompute_analytics_enabled'
  | 'automated_dr_drill_enabled';

interface FeatureFlag {
  key: string;
  is_enabled: boolean;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

// Use any for supabase client to avoid version mismatch issues
// deno-lint-ignore no-explicit-any
type SupabaseClientAny = any;

/**
 * Check if a feature flag is enabled.
 * Returns true by default (fail open) if the flag cannot be read.
 */
export async function isFeatureEnabled(
  supabase: SupabaseClientAny,
  flagKey: FeatureFlagKey
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('platform_feature_flags')
      .select('is_enabled')
      .eq('key', flagKey)
      .single();

    if (error) {
      console.error(`[feature-flags] Error checking ${flagKey}:`, error.message);
      return true; // Fail open
    }

    return data?.is_enabled ?? true;
  } catch (err) {
    console.error(`[feature-flags] Exception checking ${flagKey}:`, err);
    return true; // Fail open
  }
}

/**
 * Check feature flag and return a standardized blocked response if disabled.
 */
export async function checkFeatureOrBlock(
  supabase: SupabaseClientAny,
  flagKey: FeatureFlagKey,
  featureName: string
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  const enabled = await isFeatureEnabled(supabase, flagKey);

  if (!enabled) {
    const traceId = crypto.randomUUID();
    
    // Log the block
    try {
      await supabase.rpc('rpc_log_system_event', {
        p_env: 'prod',
        p_source: 'feature_flag',
        p_severity: 'warn',
        p_code: 'FEATURE_DISABLED_BLOCK',
        p_message: `Request blocked: ${featureName} is disabled`,
        p_meta: { flag_key: flagKey, trace_id: traceId }
      });
    } catch (logErr) {
      console.error('[feature-flags] Failed to log block:', logErr);
    }

    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'feature_disabled',
          message: `This feature (${featureName}) is temporarily disabled for maintenance.`,
          feature: flagKey,
          trace_id: traceId,
          support_url: '/admin/system-status',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return { allowed: true };
}

/**
 * Get all feature flags (for admin UI).
 */
export async function getAllFeatureFlags(
  supabase: SupabaseClientAny
): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('platform_feature_flags')
    .select('*')
    .order('key');

  if (error) {
    console.error('[feature-flags] Error fetching all flags:', error);
    return [];
  }

  return data || [];
}
