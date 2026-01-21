import { ReactNode, useEffect, useRef, useState } from 'react';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Loader2, ShieldOff, AlertTriangle } from 'lucide-react';
import NotFound from '@/pages/NotFound';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { isPlatformAdmin, isPlatformBilling, isLoading: roleLoading } = usePlatformRole();
  const { isImpersonating, endImpersonation, loading: impersonationLoading } = useImpersonation();
  const navigate = useNavigate();
  const hasLoggedRef = useRef(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);

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

        const { data, error } = await supabase.functions.invoke('log-admin-login', {
          body: {
            user_id: user.id,
            user_agent: navigator.userAgent,
            session_id: sessionId,
          },
        });

        if (error) {
          console.error('Failed to log admin login:', error);
          return;
        }

        // Check if user is blocked
        if (data?.blocked) {
          setIsBlocked(true);
          setBlockReason(data.reason || 'Votre compte a été bloqué.');
        }
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

  // Block admin access when impersonating
  if (isImpersonating) {
    const handleExitImpersonation = async () => {
      await endImpersonation('Exited to access admin');
      navigate('/admin/users');
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-amber-500/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-amber-700">Mode Support Actif</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              L'accès aux routes administrateur est bloqué pendant une session de support.
            </p>
            <p className="text-sm text-muted-foreground">
              Quittez le mode support pour accéder au back-office.
            </p>
            <Button
              variant="outline"
              onClick={handleExitImpersonation}
              disabled={impersonationLoading}
              className="mt-4"
            >
              Quitter le mode support
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show blocked message if user is blocked
  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldOff className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Accès Bloqué</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {blockReason}
            </p>
            <p className="text-sm text-muted-foreground">
              Si vous pensez qu'il s'agit d'une erreur, veuillez contacter un super administrateur.
            </p>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="mt-4"
            >
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
