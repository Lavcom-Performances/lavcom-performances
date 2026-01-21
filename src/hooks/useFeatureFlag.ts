import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FeatureFlagKey = 
  | 'imports_enabled'
  | 'ai_enabled'
  | 'exports_enabled'
  | 'stripe_checkout_enabled'
  | 'recompute_analytics_enabled'
  | 'automated_dr_drill_enabled';

interface UseFeatureFlagOptions {
  /** Refresh interval in ms. Default: 30000 (30s) */
  refetchInterval?: number;
}

/**
 * Hook to check if a feature flag is enabled.
 * Returns true by default (fail open) while loading or on error.
 */
export function useFeatureFlag(
  flagKey: FeatureFlagKey,
  options: UseFeatureFlagOptions = {}
) {
  const { refetchInterval = 30000 } = options;

  const { data, isLoading, error } = useQuery({
    queryKey: ['feature-flag', flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_feature_flags')
        .select('is_enabled')
        .eq('key', flagKey)
        .single();

      if (error) throw error;
      return data?.is_enabled ?? true;
    },
    refetchInterval,
    staleTime: 10000, // Consider data stale after 10s
  });

  return {
    isEnabled: data ?? true, // Fail open
    isLoading,
    error,
  };
}

/**
 * Hook to get all feature flags at once.
 */
export function useAllFeatureFlags(options: UseFeatureFlagOptions = {}) {
  const { refetchInterval = 30000 } = options;

  return useQuery({
    queryKey: ['feature-flags-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_feature_flags')
        .select('key, is_enabled');

      if (error) throw error;
      
      const flagMap: Record<FeatureFlagKey, boolean> = {
        imports_enabled: true,
        ai_enabled: true,
        exports_enabled: true,
        stripe_checkout_enabled: true,
        recompute_analytics_enabled: true,
        automated_dr_drill_enabled: false,
      };

      for (const flag of (data || [])) {
        if (flag.key in flagMap) {
          flagMap[flag.key as FeatureFlagKey] = flag.is_enabled;
        }
      }

      return flagMap;
    },
    refetchInterval,
    staleTime: 10000,
  });
}
