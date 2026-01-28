import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ReadinessResult {
  status: 'READY' | 'NOT_READY';
  evaluatedAt: string;
  checks: {
    id: string;
    name: string;
    category: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    reason?: string;
  }[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * Hook to check platform readiness status.
 * Used to soft-block irreversible actions when platform is NOT_READY.
 */
export function usePlatformReadiness() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-readiness-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      // Check if user is platform admin (only they can see full status)
      const { data: platformRole } = await supabase
        .from('platform_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .in('role', ['super_admin', 'admin'])
        .maybeSingle();

      // Non-platform-admins get a simplified check
      if (!platformRole) {
        // For regular users, just check if critical feature flags are disabled
        const { data: flags } = await supabase
          .from('platform_feature_flags')
          .select('key, is_enabled')
          .in('key', ['stripe_checkout_enabled', 'exports_enabled']);

        const disabledFlags = flags?.filter(f => !f.is_enabled) || [];
        
        return {
          status: disabledFlags.length > 0 ? 'NOT_READY' : 'READY',
          blockedFeatures: disabledFlags.map(f => f.key),
        } as { status: 'READY' | 'NOT_READY'; blockedFeatures: string[] };
      }

      // Platform admins get full readiness check
      const response = await supabase.functions.invoke('evaluate-platform-readiness');
      if (response.error) {
        console.error('Platform readiness check failed:', response.error);
        return { status: 'READY' as const, blockedFeatures: [] }; // Fail open
      }
      
      return {
        ...(response.data as ReadinessResult),
        blockedFeatures: (response.data as ReadinessResult).checks
          .filter(c => c.status === 'FAIL')
          .map(c => c.id),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  return {
    isReady: data?.status === 'READY',
    isNotReady: data?.status === 'NOT_READY',
    blockedFeatures: data?.blockedFeatures || [],
    isLoading,
    error,
    fullData: data,
  };
}

/**
 * Check if a specific feature is blocked due to platform not being ready.
 */
export function useIsFeatureBlocked(featureKey: string) {
  const { blockedFeatures, isNotReady, isLoading } = usePlatformReadiness();
  
  // Feature is blocked if platform is not ready AND this feature is specifically flagged
  const isBlocked = isNotReady && (
    blockedFeatures.includes(featureKey) ||
    blockedFeatures.includes(`flag_${featureKey}`)
  );

  return {
    isBlocked,
    isLoading,
    reason: isBlocked ? 'Platform not ready for release' : undefined,
  };
}
