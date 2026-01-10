import { ReactNode, useEffect, useRef } from 'react';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import NotFound from '@/pages/NotFound';
import { supabase } from '@/integrations/supabase/client';

interface PlatformAdminRouteProps {
  children: ReactNode;
  requireBilling?: boolean; // For billing-only access (includes admin/super_admin)
}

/**
 * Protects routes that should only be accessible to platform admins.
 * Returns 404 page for non-platform users (not "access denied" to hide admin existence).
 * Also logs admin login when accessing the admin area.
 */
export function PlatformAdminRoute({ children, requireBilling = false }: PlatformAdminRouteProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isPlatformAdmin, isPlatformBilling, isLoading: roleLoading } = usePlatformRole();
  const hasLoggedRef = useRef(false);

  // Log admin login when accessing admin area
  useEffect(() => {
    const logAdminLogin = async () => {
      if (!user?.id || hasLoggedRef.current) return;
      
      const hasAccess = requireBilling ? isPlatformBilling : isPlatformAdmin;
      if (!hasAccess) return;

      hasLoggedRef.current = true;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionId = sessionData?.session?.access_token?.substring(0, 16) || null;

        await supabase.functions.invoke('log-admin-login', {
          body: {
            user_id: user.id,
            user_agent: navigator.userAgent,
            session_id: sessionId,
          },
        });
      } catch (error) {
        console.error('Failed to log admin login:', error);
      }
    };

    if (!authLoading && !roleLoading && isAuthenticated) {
      logAdminLogin();
    }
  }, [user?.id, isPlatformAdmin, isPlatformBilling, requireBilling, authLoading, roleLoading, isAuthenticated]);

  // Show loading while checking auth/role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show 404 (hide admin existence)
  if (!isAuthenticated) {
    return <NotFound />;
  }

  // Check appropriate role
  const hasAccess = requireBilling ? isPlatformBilling : isPlatformAdmin;

  // Not a platform admin - show 404 (hide admin existence)
  if (!hasAccess) {
    return <NotFound />;
  }

  return <>{children}</>;
}
