/**
 * Login Page Component
 * 
 * This page handles user authentication with multiple features:
 * - Email/password login
 * - Google OAuth login
 * - Demo mode access
 * - Platform admin bypass (redirects admins to /admin instead of laundromat selection)
 * - Rate limiting to prevent brute force attacks
 * - Multi-language support (i18n)
 * - Two modes: "exploitant" (laundromat operator) and "simulateur" (simulator)
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Home, Sparkles, Clock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import { usePlatformRole } from "@/hooks/usePlatformRole";
import { useLoginSecurity, RiskLevel, LoginRiskResult } from "@/hooks/useLoginSecurity";
import { supabase } from "@/integrations/supabase/client";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";
import { useTranslation } from "react-i18next";
import { 
  checkClientRateLimit, 
  recordClientRequest, 
  getCooldownRemaining,
  formatCooldown 
} from "@/lib/rateLimiter";
import { SEOHead } from "@/components/seo/SEOHead";
import { LanguageSelector } from "@/components/ui/language-selector";
import { RiskLoginVerificationModal } from "@/components/security/RiskLoginVerificationModal";
import { LoginHelpPanel } from "@/components/auth/LoginHelpPanel";
import { AuthErrorBanner } from "@/components/auth/AuthErrorBanner";
import { AuthErrorCode, parseAuthErrorCode, generateTraceId } from "@/lib/auth/authErrorCodes";
import { logAuthErrorShown } from "@/lib/auth/loginHelpLogger";

export default function Login() {
  const { t } = useTranslation(['app', 'common']);
  
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Loading states for different actions
  const [isLoading, setIsLoading] = useState(false);           // Email/password login
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // Google OAuth login
  
  // Rate limiting state (cooldown in seconds after too many attempts)
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  
  // Risk-based login verification state
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskResult, setRiskResult] = useState<LoginRiskResult | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  
  // Help panel state
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [loginError, setLoginError] = useState<{ code: AuthErrorCode; message: string; traceId: string } | null>(null);
  
  // ============================================
  // HOOKS
  // ============================================
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Authentication state and methods from Supabase
  const { signIn, signInWithGoogle, isAuthenticated, loading } = useAuth();
  
  // Demo mode - allows creating a demo laundromat for testing
  const { createDemoSite, isCreatingDemo } = useDemoMode();
  
  // Platform role check - determines if user is a platform admin/billing
  // Used to bypass laundromat selection for admin users
  const { isPlatformAdmin, isPlatformBilling, isLoading: platformRoleLoading } = usePlatformRole();
  
  // Login security - risk assessment
  const { checkLoginRisk } = useLoginSecurity();

  // ============================================
  // URL PARAMETERS
  // ============================================
  
  // Check if user came from demo link (?demo=true)
  const isDemoRequested = searchParams.get("demo") === "true";
  
  // Mode: "exploitant" (default) or "simulateur"
  const mode = searchParams.get("mode") ?? "exploitant";
  
  // Optional redirect URL after login
  const redirectUrl = searchParams.get("redirect");
  
  // Derived state
  const isSimulatorMode = mode === "simulateur";
  const currentMode = isSimulatorMode ? 'simulator' : 'exploitant';
  const isRateLimited = cooldownSeconds > 0;

  // ============================================
  // RATE LIMITING EFFECTS
  // ============================================
  
  /**
   * Check rate limit cooldown when email changes
   * This prevents brute force attacks by limiting login attempts
   */
  useEffect(() => {
    if (email) {
      const remaining = getCooldownRemaining('auth/login', email);
      setCooldownSeconds(remaining);
    }
  }, [email]);

  /**
   * Countdown timer for rate limit cooldown
   * Decrements every second until cooldown expires
   */
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // ============================================
  // POST-AUTHENTICATION REDIRECT LOGIC
  // ============================================
  
  /**
   * Handle redirect after successful authentication
   * 
   * Priority order:
   * 1. Wait for auth and platform role to load
   * 2. If demo requested → create demo site
   * 3. Read context from localStorage (lavcom_app_context)
   * 4. If context=="platform" AND isPlatformAdmin → /admin or lastAdminPath
   * 5. If context=="platform" AND isPlatformBilling → /admin/sales
   * 6. Else → SaaS: lastSaasPath OR /select-laundromat
   */
  useEffect(() => {
    // Wait for both auth and platform role to be loaded
    if (loading || platformRoleLoading) return;
    
    if (isAuthenticated && isDemoRequested) {
      // User is authenticated and wants demo - create demo site
      createDemoSite();
    } else if (isAuthenticated && !isDemoRequested) {
      // Import context helpers
      const getStoredContext = () => {
        try {
          const value = localStorage.getItem('lavcom_app_context');
          if (value === 'platform' || value === 'saas') return value;
          return null;
        } catch {
          return null;
        }
      };
      
      const getLastPath = (type: 'admin' | 'saas') => {
        try {
          const key = type === 'admin' ? 'lavcom_last_admin_path' : 'lavcom_last_saas_path';
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      };
      
      // Get stored context or default based on role
      const storedContext = getStoredContext();
      const defaultContext = (isPlatformAdmin || isPlatformBilling) ? 'platform' : 'saas';
      const effectiveContext = storedContext || defaultContext;
      
      // Validate: can only be in platform context if user has platform role
      const context = effectiveContext === 'platform' && !isPlatformAdmin && !isPlatformBilling 
        ? 'saas' 
        : effectiveContext;
      
      // Handle redirect URL first (e.g., from ?redirect=)
      if (redirectUrl) {
        navigate(redirectUrl);
        return;
      }
      
      // Platform context routing
      if (context === 'platform') {
        if (isPlatformAdmin) {
          const lastAdminPath = getLastPath('admin');
          navigate(lastAdminPath || '/admin');
          return;
        }
        if (isPlatformBilling) {
          const lastAdminPath = getLastPath('admin');
          navigate(lastAdminPath?.startsWith('/admin/sales') ? lastAdminPath : '/admin/sales');
          return;
        }
      }
      
      // SaaS context routing
      if (isSimulatorMode) {
        navigate("/simulation");
      } else {
        const lastSaasPath = getLastPath('saas');
        navigate(lastSaasPath || "/select-laundromat");
      }
    }
  }, [
    loading, 
    platformRoleLoading, 
    isAuthenticated, 
    navigate, 
    redirectUrl, 
    isSimulatorMode, 
    isDemoRequested, 
    createDemoSite, 
    isPlatformAdmin, 
    isPlatformBilling
  ]);

  // ============================================
  // FORM SUBMISSION HANDLER
  // ============================================
  
  /**
   * Handle email/password login form submission
   * 
   * Steps:
   * 1. Check client-side rate limit
   * 2. Record the login attempt
   * 3. Call signIn with credentials
   * 4. Handle errors or redirect on success
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check client-side rate limit before attempting login
    const rateLimitCheck = checkClientRateLimit('auth/login', email);
    if (!rateLimitCheck.allowed) {
      setCooldownSeconds(rateLimitCheck.cooldownSeconds);
      toast({
        title: t('app:rateLimit.auth_login.title'),
        description: t('app:rateLimit.auth_login.message', { time: formatCooldown(rateLimitCheck.cooldownSeconds) }),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Record the attempt for rate limiting
    recordClientRequest('auth/login', email);
    
    // Attempt authentication
    const { data, error } = await signIn(email, password);
    
    // Handle authentication errors
    if (error) {
      setIsLoading(false);
      const errorCode = parseAuthErrorCode(error.message);
      const traceId = generateTraceId();
      
      setLoginError({
        code: errorCode,
        message: error.message,
        traceId,
      });
      
      // Log the error for analytics
      logAuthErrorShown(errorCode, { 
        context: 'login',
        trace_id: traceId,
      });
      
      // Also show toast for immediate feedback
      let errorMessage = error.message;
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = t('app:login.invalidCredentials');
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = t('app:login.confirmEmail');
      }
      
      toast({
        title: t('app:login.errorTitle'),
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }
    
    // Clear any previous errors on successful auth
    setLoginError(null);
    
    // Check login risk BEFORE allowing navigation
    const userId = data?.user?.id;
    if (userId) {
      const risk = await checkLoginRisk(userId);
      
      if (risk && risk.risk_level !== 'low' && !risk.is_trusted_device) {
        // High or medium risk detected on untrusted device - show verification modal
        setRiskResult(risk);
        setShowRiskModal(true);
        setIsLoading(false);
        // Don't proceed with navigation until verified
        return;
      }
    }
    
    setIsLoading(false);
    
    // Success toast
    toast({
      title: t('app:login.loginSuccess'),
      description: isSimulatorMode ? t('app:login.welcomeSimulator') : t('app:login.welcomeExploitant'),
    });
    
    // Mark that we should redirect
    setPendingRedirect(true);
  };

  // ============================================
  // RISK VERIFICATION HANDLERS
  // ============================================
  
  /**
   * Called when user successfully verifies their identity
   * via MFA, OTP, or recovery code in the risk modal
   */
  const handleRiskVerified = () => {
    setShowRiskModal(false);
    setRiskResult(null);
    
    toast({
      title: t('app:login.loginSuccess'),
      description: isSimulatorMode ? t('app:login.welcomeSimulator') : t('app:login.welcomeExploitant'),
    });
    
    // Now proceed with redirect
    setPendingRedirect(true);
  };

  /**
   * Called when user closes the risk modal without verifying
   * We sign them out for security
   */
  const handleRiskModalClose = async () => {
    setShowRiskModal(false);
    setRiskResult(null);
    // Sign out for security if they don't verify
    await supabase.auth.signOut();
    toast({
      title: t('app:securityCenter.riskLogin.verificationRequired'),
      description: t('app:securityCenter.riskLogin.sessionEnded'),
    });
  };

  
  /**
   * Show loading spinner while:
   * - Auth state is being determined
   * - Platform role is being checked
   * - Demo site is being created
   * - User is authenticated and demo was requested
   */
  if (loading || platformRoleLoading || (isAuthenticated && isDemoRequested) || isCreatingDemo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {(isDemoRequested || isCreatingDemo) && (
          <p className="text-muted-foreground">{t('app:demo.creating', 'Création de la démo...')}</p>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      {/* SEO Meta Tags - noindex to prevent search engine indexing of login page */}
      <SEOHead 
        title="Connexion"
        description="Connectez-vous à Lavcom Performances pour accéder à votre tableau de bord de gestion de laverie automatique."
        url="/login"
        noindex={true}
      />
      
      <div className="min-h-screen flex bg-background relative">
        {/* ========== NAVIGATION ELEMENTS ========== */}
        
        {/* Back to home button - positioned top-left */}
        <Link 
          to="/" 
          aria-label={t('common:home')}
          className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Home className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('common:home')}</span>
        </Link>

        {/* Language selector - positioned top-right */}
        <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10">
          <LanguageSelector variant="compact" />
        </div>

        {/* ========== LEFT PANEL - BRANDING (Desktop only) ========== */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8 lg:p-12 bg-gradient-to-br from-muted/30 via-background to-primary/5 border-r border-border">
          <div className="max-w-md text-center animate-fade-in">
            {/* Logo */}
            <div className="mb-10">
              <img 
                src={lavcomLogo} 
                alt="Lavcom Performances" 
                className="w-full max-w-xs mx-auto"
              />
            </div>
            
            {/* Subtitle - changes based on mode (exploitant/simulator) */}
            <p className="text-muted-foreground text-base mb-8">
              {t(`app:login.${currentMode}.leftPanelSubtitle`)}
            </p>
            
            {/* Stats card - displays key metrics/features */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                {isSimulatorMode ? (
                  // Simulator mode stats
                  <>
                    <div className="space-y-1">
                      <p className="text-xl font-display font-bold text-foreground">{t('app:login.simulator.stats.quickEstimate')}</p>
                      <p className="text-xs text-muted-foreground">{t('app:login.simulator.stats.quickEstimateLabel')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-display font-bold text-foreground">{t('app:login.simulator.stats.bankReport')}</p>
                      <p className="text-xs text-muted-foreground">{t('app:login.simulator.stats.bankReportLabel')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-display font-bold text-foreground">{t('app:login.simulator.stats.unlimitedScenarios')}</p>
                      <p className="text-xs text-muted-foreground">{t('app:login.simulator.stats.unlimitedScenariosLabel')}</p>
                    </div>
                  </>
                ) : (
                  // Exploitant (operator) mode stats
                  <>
                    <div className="space-y-1">
                      <p className="text-xl font-display font-bold text-primary">{t('app:login.exploitant.stats.realtime')}</p>
                      <p className="text-xs text-muted-foreground">{t('app:login.exploitant.stats.realtimeLabel')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-display font-bold text-primary">{t('app:login.exploitant.stats.timeSaved')}</p>
                      <p className="text-xs text-muted-foreground">{t('app:login.exploitant.stats.timeSavedLabel')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-display font-bold text-primary">{t('app:login.exploitant.stats.secureData')}</p>
                      <p className="text-xs text-muted-foreground">{t('app:login.exploitant.stats.secureDataLabel')}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Decorative footer text */}
            <p className="mt-8 text-sm text-muted-foreground">
              {t('app:login.decorativeText')}
            </p>
          </div>
        </div>

        {/* ========== RIGHT PANEL - LOGIN FORM ========== */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md space-y-6 lg:space-y-8 animate-fade-in">
            
            {/* Mobile Logo - only shown on small screens */}
            <div className="lg:hidden text-center mb-4 sm:mb-6 lg:mb-8">
              <img 
                src={lavcomLogo} 
                alt="Lavcom Performances" 
                className="w-36 sm:w-48 mx-auto"
              />
            </div>

            {/* Demo mode banner - shown when ?demo=true */}
            {isDemoRequested && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <p className="text-sm font-medium">
                    {t('app:login.demoMode', 'Connectez-vous pour accéder à la démo interactive')}
                  </p>
                </div>
              </div>
            )}

            {/* Page title and subtitle */}
            <div className="space-y-1.5 md:space-y-2">
              <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
                {isDemoRequested 
                  ? t('app:login.demoTitle', 'Accéder à la démo') 
                  : t(`app:login.${currentMode}.title`)}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                {isDemoRequested 
                  ? t('app:login.demoSubtitle', 'Connectez-vous ou créez un compte pour explorer la démo')
                  : t(`app:login.${currentMode}.subtitle`)}
              </p>
            </div>

            {/* ========== LOGIN FORM ========== */}
            <form onSubmit={handleSubmit} className="space-y-6" aria-label={t(`app:login.${currentMode}.title`)}>
              
              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email">{t('app:login.form.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('app:login.form.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-required="true"
                  autoComplete="email"
                  className="h-11 focus:ring-2 focus:ring-primary focus:ring-offset-1"
                />
              </div>

              {/* Password field with show/hide toggle */}
              <div className="space-y-2">
                <Label htmlFor="password">{t('app:login.form.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('app:login.form.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-required="true"
                    autoComplete="current-password"
                    className="h-11 pr-10 focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  />
                  {/* Password visibility toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('app:accessibility.hidePassword') : t('app:accessibility.showPassword')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t('app:login.form.forgotPassword')}
                </Link>
              </div>

              {/* Error banner */}
              {loginError && (
                <AuthErrorBanner
                  errorCode={loginError.code}
                  traceId={loginError.traceId}
                  onContactSupport={() => setShowHelpPanel(true)}
                  compact
                />
              )}

              {/* Submit button - shows different states: loading, rate limited, or normal */}
              <Button
                type="submit"
                variant="lavcom"
                size="xl"
                className="w-full"
                disabled={isLoading || isRateLimited}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('app:login.form.connecting')}
                  </>
                ) : isRateLimited ? (
                  <>
                    <Clock className="h-4 w-4" />
                    {t('app:rateLimit.cooldownMessage', { time: formatCooldown(cooldownSeconds) })}
                  </>
                ) : (
                  t('app:login.form.submit')
                )}
              </Button>

              {/* Need Help link */}
              <button
                type="button"
                onClick={() => setShowHelpPanel(true)}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <HelpCircle className="h-4 w-4" />
                {t('common:needHelp')}
              </button>
            </form>

            {/* ========== ALTERNATIVE LOGIN OPTIONS ========== */}
            
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('app:login.or')}</span>
              </div>
            </div>

            {/* Google OAuth Sign In */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={async () => {
                setIsGoogleLoading(true);
                const { error } = await signInWithGoogle();
                if (error) {
                  toast({
                    title: t('common:error'),
                    description: error.message,
                    variant: "destructive",
                  });
                  setIsGoogleLoading(false);
                }
                // Note: On success, user will be redirected by OAuth flow
              }}
              disabled={isGoogleLoading}
              aria-label={t('app:login.continueWithGoogle')}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
              ) : (
                // Google logo SVG
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {t('app:login.continueWithGoogle')}
            </Button>

            {/* ========== SIGNUP AND PRICING LINKS ========== */}
            
            {/* Free trial CTA */}
            <Link to="/signup" className="block">
              <Button variant="ghost" size="lg" className="w-full group">
                <Sparkles className="h-4 w-4 mr-2 text-primary group-hover:text-primary" aria-hidden="true" />
                {t('app:login.freeTrial')}
              </Button>
            </Link>

            {/* Pricing/subscription link */}
            <p className="text-center text-sm text-muted-foreground">
              {t('app:login.notSubscribed')}{" "}
              <Link 
                to={isSimulatorMode ? "/subscribe-simulator" : "/pricing"} 
                className="text-primary hover:underline font-medium"
              >
                {isSimulatorMode ? t('app:login.discoverSimulatorPacks') : t('app:login.discoverOffers')}
              </Link>
            </p>

            {/* ========== MODE SWITCH ========== */}
            {/* Allows switching between exploitant and simulator modes */}
            <div className="pt-4 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                {isSimulatorMode ? (
                  <>
                    {t('app:login.switchToExploitant')}{" "}
                    <Link to="/login?mode=exploitant" className="text-primary hover:underline">
                      {t('app:login.exploitantLogin')}
                    </Link>
                  </>
                ) : (
                  <>
                    {t('app:login.switchToSimulator')}{" "}
                    <Link to="/login?mode=simulateur" className="text-primary hover:underline">
                      {t('app:login.simulatorLogin')}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk-based verification modal */}
      <RiskLoginVerificationModal
        isOpen={showRiskModal}
        onClose={handleRiskModalClose}
        onVerified={handleRiskVerified}
        riskLevel={riskResult?.risk_level || 'medium'}
        reasons={riskResult?.reasons || []}
        mfaEnrolled={riskResult?.mfa_enrolled || false}
      />

      {/* Login Help Panel */}
      <LoginHelpPanel
        open={showHelpPanel}
        onOpenChange={setShowHelpPanel}
        context="login"
        lastErrorCode={loginError?.code}
        userEmail={email || undefined}
      />
    </>
  );
}
