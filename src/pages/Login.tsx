import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Home, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDemoMode } from "@/hooks/useDemoMode";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";
import { useTranslation } from "react-i18next";
import { 
  checkClientRateLimit, 
  recordClientRequest, 
  getCooldownRemaining,
  formatCooldown 
} from "@/lib/rateLimiter";
import { SEOHead } from "@/components/seo/SEOHead";

export default function Login() {
  const { t } = useTranslation(['app', 'common']);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { signIn, signInWithGoogle, isAuthenticated, loading } = useAuth();
  const { createDemoSite, isCreatingDemo } = useDemoMode();

  // Check if demo mode is requested
  const isDemoRequested = searchParams.get("demo") === "true";

  // Check rate limit cooldown on mount and update countdown
  useEffect(() => {
    if (email) {
      const remaining = getCooldownRemaining('auth/login', email);
      setCooldownSeconds(remaining);
    }
  }, [email]);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // Get mode and redirect from URL params
  const mode = searchParams.get("mode") ?? "exploitant";
  const redirectUrl = searchParams.get("redirect");
  const isSimulatorMode = mode === "simulateur";

  // Handle demo mode for authenticated users
  useEffect(() => {
    if (!loading && isAuthenticated && isDemoRequested) {
      // User is authenticated and wants demo - create demo site
      createDemoSite();
    } else if (!loading && isAuthenticated && !isDemoRequested) {
      // Normal authenticated flow
      if (redirectUrl) {
        navigate(redirectUrl);
      } else if (isSimulatorMode) {
        navigate("/simulation");
      } else {
        navigate("/select-laundromat");
      }
    }
  }, [loading, isAuthenticated, navigate, redirectUrl, isSimulatorMode, isDemoRequested, createDemoSite]);

  const isRateLimited = cooldownSeconds > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check client-side rate limit
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
    
    // Record the attempt
    recordClientRequest('auth/login', email);
    
    const { error } = await signIn(email, password);
    
    setIsLoading(false);
    
    if (error) {
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
    
    toast({
      title: t('app:login.loginSuccess'),
      description: isSimulatorMode ? t('app:login.welcomeSimulator') : t('app:login.welcomeExploitant'),
    });
    
    // Redirect based on mode
    if (redirectUrl) {
      navigate(redirectUrl);
    } else if (isSimulatorMode) {
      navigate("/simulation");
    } else {
      navigate("/select-laundromat");
    }
  };

  const currentMode = isSimulatorMode ? 'simulator' : 'exploitant';

  // Don't render if already authenticated and loading, or if demo is being created
  if (loading || (isAuthenticated && isDemoRequested) || isCreatingDemo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {(isDemoRequested || isCreatingDemo) && (
          <p className="text-muted-foreground">{t('app:demo.creating', 'Création de la démo...')}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Connexion"
        description="Connectez-vous à Lavcom Performances pour accéder à votre tableau de bord de gestion de laverie automatique."
        url="/login"
        noindex={true}
      />
      <div className="min-h-screen flex bg-background relative">
      {/* Back to home button */}
      <Link 
        to="/" 
        aria-label={t('common:home')}
        className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <Home className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('common:home')}</span>
      </Link>

      {/* Left side - Branding */}
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
          
          <p className="text-muted-foreground text-base mb-8">
            {t(`app:login.${currentMode}.leftPanelSubtitle`)}
          </p>
          
          {/* Stats card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-4 text-center">
              {isSimulatorMode ? (
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
          
          {/* Decorative text */}
          <p className="mt-8 text-sm text-muted-foreground">
            {t('app:login.decorativeText')}
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6 lg:space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-4 sm:mb-6 lg:mb-8">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Performances" 
              className="w-36 sm:w-48 mx-auto"
            />
          </div>

          {/* Demo mode banner */}
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

          <form onSubmit={handleSubmit} className="space-y-6" aria-label={t(`app:login.${currentMode}.title`)}>
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

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                {t('app:login.form.forgotPassword')}
              </Link>
            </div>

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
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t('app:login.or')}</span>
            </div>
          </div>

          {/* Google Sign In */}
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
            }}
            disabled={isGoogleLoading}
            aria-label={t('app:login.continueWithGoogle')}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
            ) : (
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

          {/* Free trial CTA */}
          <Link to="/signup" className="block">
            <Button variant="ghost" size="lg" className="w-full group">
              <Sparkles className="h-4 w-4 mr-2 text-primary group-hover:text-primary" aria-hidden="true" />
              {t('app:login.freeTrial')}
            </Button>
          </Link>

          <p className="text-center text-sm text-muted-foreground">
            {t('app:login.notSubscribed')}{" "}
            <Link 
              to={isSimulatorMode ? "/subscribe-simulator" : "/pricing"} 
              className="text-primary hover:underline font-medium"
            >
              {isSimulatorMode ? t('app:login.discoverSimulatorPacks') : t('app:login.discoverOffers')}
            </Link>
          </p>

          {/* Mode switch */}
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

          <p className="text-center text-sm text-muted-foreground">
            {t('common:needHelp')}{" "}
            <a href="#" className="text-primary hover:underline">
              {t('common:contactSupport')}
            </a>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
