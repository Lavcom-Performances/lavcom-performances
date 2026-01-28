import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useCurrentSite } from '@/hooks/useCurrentSite';
import { Loader2, ShieldX, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const navigate = useNavigate();
  const { isAdmin, loading } = useIsAdmin();
  const { isDemo, isLoading: siteLoading } = useCurrentSite();

  useEffect(() => {
    // Block demo users from admin routes
    if (!siteLoading && isDemo) {
      toast({
        title: "Accès restreint",
        description: "Cette section n'est pas disponible en mode démo.",
        variant: "destructive",
      });
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!loading && !isAdmin) {
      // Redirect non-admins silently to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [loading, isAdmin, siteLoading, isDemo, navigate]);

  if (loading || siteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Vérification des droits...</p>
        </div>
      </div>
    );
  }

  // Block demo mode
  if (isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-primary" />
          <p className="text-lg font-medium">Accès restreint</p>
          <p className="text-sm text-muted-foreground">Cette section n'est pas disponible en mode démo.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <ShieldX className="h-12 w-12 text-destructive" />
          <p className="text-lg font-medium">Accès refusé</p>
          <p className="text-sm text-muted-foreground">Vous n'avez pas les droits pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
