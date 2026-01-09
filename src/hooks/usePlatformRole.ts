import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type PlatformRole = 'super_admin' | 'admin' | 'billing' | null;

interface PlatformRoleState {
  role: PlatformRole;
  isPlatformSuperAdmin: boolean;
  isPlatformAdmin: boolean;
  isPlatformBilling: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function usePlatformRole(): PlatformRoleState {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<PlatformRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user?.id) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    try {
      // Use RPC to check role (SECURITY DEFINER functions)
      const [superAdminResult, adminResult, billingResult] = await Promise.all([
        supabase.rpc('is_platform_super_admin', { uid: user.id }),
        supabase.rpc('is_platform_admin', { uid: user.id }),
        supabase.rpc('is_platform_billing', { uid: user.id }),
      ]);

      if (superAdminResult.data === true) {
        setRole('super_admin');
      } else if (adminResult.data === true) {
        setRole('admin');
      } else if (billingResult.data === true) {
        setRole('billing');
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching platform role:', error);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      fetchRole();
    }
  }, [authLoading, fetchRole]);

  return {
    role,
    isPlatformSuperAdmin: role === 'super_admin',
    isPlatformAdmin: role === 'super_admin' || role === 'admin',
    isPlatformBilling: role === 'super_admin' || role === 'admin' || role === 'billing',
    isLoading: authLoading || isLoading,
    refresh: fetchRole,
  };
}
