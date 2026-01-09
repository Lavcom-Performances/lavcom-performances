import { ReactNode } from 'react';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import NotFound from '@/pages/NotFound';

interface PlatformAdminRouteProps {
  children: ReactNode;
  requireBilling?: boolean; // For billing-only access (includes admin/super_admin)
}

/**
 * Protects routes that should only be accessible to platform admins.
 * Returns 404 page for non-platform users (not "access denied" to hide admin existence).
 */
export function PlatformAdminRoute({ children, requireBilling = false }: PlatformAdminRouteProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isPlatformAdmin, isPlatformBilling, isLoading: roleLoading } = usePlatformRole();

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
