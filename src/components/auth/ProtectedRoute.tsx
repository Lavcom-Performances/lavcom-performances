import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { TrialExpiredPaywall } from '@/components/trial/TrialExpiredPaywall';
import { EmailVerificationRequired } from '@/components/auth/EmailVerificationRequired';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireSubscription?: boolean;
  requireEmailVerification?: boolean;
}

// Public routes that should never redirect to /select-laundromat
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/pricing',
  '/forgot-password',
  '/reset-password',
  '/',
  '/cgv',
  '/mentions-legales',
  '/politique-confidentialite',
];

export function ProtectedRoute({ 
  children, 
  requireSubscription = true,
  requireEmailVerification = true,
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading, signOut, isEmailVerified } = useAuth();
  // Get platform role FIRST - this is the source of truth for bypass
  const { isPlatformSuperAdmin, isLoading: roleLoading } = usePlatformRole();
  // useSubscription also uses isPlatformBypass internally
  const { isSubscriptionActive, isExpired, loading: subLoading, isPlatformBypass } = useSubscription();

  useEffect(() => {
    // Guard 1: Not authenticated -> redirect to login
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Show loading while checking auth and role
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

  // Not authenticated - will redirect via useEffect
  if (!isAuthenticated) {
    return null;
  }

  // Platform super_admin bypasses ALL restrictions (email verification, subscription)
  // Check BOTH sources to ensure bypass works correctly
  // IMPORTANT: Check this BEFORE subscription loading to prevent paywall flash
  if (isPlatformSuperAdmin || isPlatformBypass) {
    return <>{children}</>;
  }

  // Wait for subscription data only for non-platform-admins
  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
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

  // Guard 2: Subscription expired - show paywall (BEFORE checking for site selection)
  // This prevents infinite loops between /select-laundromat and /trial-ended
  if (requireSubscription && isExpired && !isSubscriptionActive) {
    return (
      <TrialExpiredPaywall 
        onContactSupport={() => window.open('mailto:support@lavcom.fr', '_blank')}
      />
    );
  }

  return <>{children}</>;
}
