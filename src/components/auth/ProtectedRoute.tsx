import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { TrialExpiredPaywall } from '@/components/trial/TrialExpiredPaywall';
import { EmailVerificationRequired } from '@/components/auth/EmailVerificationRequired';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireSubscription?: boolean;
  requireEmailVerification?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireSubscription = true,
  requireEmailVerification = true,
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, signOut, isEmailVerified } = useAuth();
  const { isSubscriptionActive, isExpired, loading: subLoading } = useSubscription();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Show loading while checking auth
  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - will redirect via useEffect
  if (!isAuthenticated) {
    return null;
  }

  // Email not verified - show verification required screen
  if (requireEmailVerification && !isEmailVerified && user?.email) {
    return (
      <EmailVerificationRequired 
        email={user.email}
        onLogout={async () => {
          await signOut();
          navigate('/login', { replace: true });
        }}
      />
    );
  }

  // Subscription expired - show paywall
  if (requireSubscription && isExpired && !isSubscriptionActive) {
    return (
      <TrialExpiredPaywall 
        onContactSupport={() => window.open('mailto:support@lavcom.fr', '_blank')}
      />
    );
  }

  return <>{children}</>;
}
