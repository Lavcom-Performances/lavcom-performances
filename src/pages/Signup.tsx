import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Home, CheckCircle2, Gift, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";
import { z } from "zod";
import { formatFirstName, formatLastName } from "@/lib/textUtils";
import { useTranslation } from "react-i18next";
import { PasswordStrengthIndicator, usePasswordStrength } from "@/components/auth/PasswordStrengthIndicator";
import { usePasswordBreachCheck } from "@/hooks/usePasswordBreachCheck";
import { supabase } from "@/integrations/supabase/client";
import { formatCooldown } from "@/lib/rateLimiter";
import { SEOHead } from "@/components/seo/SEOHead";
import { isLeakedPasswordError, getAuthErrorMessage } from "@/lib/authErrors";
import { logAuthSecurityEvent } from "@/lib/authLogging";

export default function Signup() {
  const { t } = useTranslation(['app', 'common']);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [showAlreadyLoggedIn, setShowAlreadyLoggedIn] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithGoogle, isAuthenticated, loading: authLoading } = useAuth();
  const { logout } = useLogout();

  const { strength: passwordStrength } = usePasswordStrength(password);
  const { checkPassword, isChecking: isCheckingBreach, isBreached, breachCount, reset: resetBreachCheck } = usePasswordBreachCheck();

  const isRateLimited = cooldownSeconds > 0;

  // Check if user is already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setShowAlreadyLoggedIn(true);
    }
  }, [authLoading, isAuthenticated]);

  // Countdown effect for cooldown
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  // Debounced password breach check
  useEffect(() => {
    if (password.length < 8) {
      resetBreachCheck();
      return;
    }

    const timer = setTimeout(() => {
      checkPassword(password);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [password, checkPassword, resetBreachCheck]);

  const signupSchema = z.object({
    email: z.string().email(t('app:signup.validation.invalidEmail')),
    password: z.string()
      .min(8, t('app:signup.validation.passwordMin'))
      .regex(/[A-Z]/, t('app:passwordStrength.criteria.hasUppercase'))
      .regex(/[a-z]/, t('app:passwordStrength.criteria.hasLowercase'))
      .regex(/[0-9]/, t('app:passwordStrength.criteria.hasNumber'))
      .regex(/[!@#$%^&*(),.?":{}|<>]/, t('app:passwordStrength.criteria.hasSpecial')),
    confirmPassword: z.string(),
    firstName: z.string().min(1, t('app:signup.validation.firstNameRequired')),
    lastName: z.string().min(1, t('app:signup.validation.lastNameRequired')),
    companyName: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('app:signup.validation.passwordMismatch'),
    path: ["confirmPassword"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Check if password is breached
    if (isBreached) {
      toast({
        title: "Mot de passe compromis",
        description: "Ce mot de passe a été exposé dans des fuites de données. Veuillez en choisir un autre.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate
    const result = signupSchema.safeParse({
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      companyName,
    });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    
    setIsLoading(true);
    
    // Format names before sending (TAEX-066)
    const formattedFirstName = formatFirstName(firstName);
    const formattedLastName = formatLastName(lastName);
    
    try {
      // Call edge function with rate limiting
      const { data, error: invokeError } = await supabase.functions.invoke('auth-signup', {
        body: {
          email,
          password,
          metadata: {
            first_name: formattedFirstName,
            last_name: formattedLastName,
            company_name: companyName,
          },
        },
      });
      
      setIsLoading(false);
      
      // Handle rate limit (429)
      if (invokeError?.message?.includes('429') || data?.error === 'rate_limit_exceeded') {
        const cooldown = data?.cooldown_seconds || 60;
        setCooldownSeconds(cooldown);
        toast({
          title: t('app:rateLimit.auth_signup.title'),
          description: t('app:rateLimit.auth_signup.message', { time: formatCooldown(cooldown) }),
          variant: "destructive",
        });
        return;
      }
      
      // Handle other errors from edge function
      if (invokeError || data?.error) {
        const errorMessage = data?.error || invokeError?.message || t('common:error');
        
        // Check for leaked password error from Supabase
        if (isLeakedPasswordError(errorMessage)) {
          // Log security event (no PII)
          logAuthSecurityEvent('leaked_password_blocked', { flow: 'signup' });
          
          toast({
            title: t('common:error'),
            description: t('errors:auth.leakedPassword'),
            variant: "destructive",
          });
          return;
        }
        
        if (errorMessage.includes("already registered")) {
          toast({
            title: t('app:signup.existingAccount'),
            description: t('app:signup.alreadyRegistered'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('common:error'),
            description: getAuthErrorMessage(errorMessage, t),
            variant: "destructive",
          });
        }
        return;
      }
      
      toast({
        title: t('app:signup.accountCreated'),
        description: t('app:signup.trialStarted'),
      });
      
      navigate("/dashboard");
    } catch (err) {
      setIsLoading(false);
      toast({
        title: t('common:error'),
        description: t('common:error'),
        variant: "destructive",
      });
    }
  };

  const trialFeatures = [
    t('app:signup.trialFeatures.feature1'),
    t('app:signup.trialFeatures.feature2'),
    t('app:signup.trialFeatures.feature3'),
    t('app:signup.trialFeatures.feature4'),
    t('app:signup.trialFeatures.feature5'),
  ];

  // Show "already logged in" screen
  if (showAlreadyLoggedIn) {
    return (
      <>
        <SEOHead 
          title="Inscription - Essai gratuit"
          description="Créez votre compte Lavcom Performances et profitez de 14 jours d'essai gratuit pour gérer vos laveries automatiques."
          url="/signup"
          noindex={true}
        />
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md text-center space-y-6">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Performances" 
              className="w-48 mx-auto"
            />
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-display font-semibold text-foreground">
                {t('app:signup.alreadyLoggedIn.title')}
              </h2>
              <p className="text-muted-foreground">
                {t('app:signup.alreadyLoggedIn.description')}
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  variant="lavcom"
                  size="lg"
                  onClick={() => navigate('/select-laundromat')}
                >
                  {t('app:signup.alreadyLoggedIn.continue')}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('common:logout')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title="Inscription - Essai gratuit"
        description="Créez votre compte Lavcom Performances et profitez de 14 jours d'essai gratuit pour gérer vos laveries automatiques."
        url="/signup"
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
          
          {/* Features card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground">
                {t('app:signup.trialFeatures.title')}
              </h3>
            </div>
            
            <ul className="space-y-3 text-left">
              {trialFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Decorative element */}
          <p className="mt-8 text-sm text-muted-foreground">
            {t('app:signup.decorativeText')}
          </p>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6 lg:space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-4 sm:mb-6">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Performances" 
              className="w-36 sm:w-48 mx-auto"
            />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
              {t('app:signup.title')}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {t('app:signup.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-label={t('app:signup.title')}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('app:signup.form.firstName')} *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder={t('app:signup.form.firstNamePlaceholder')}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                  autoComplete="given-name"
                  className={`focus:ring-2 focus:ring-primary focus:ring-offset-1 ${errors.firstName ? "border-destructive" : ""}`}
                />
                {errors.firstName && (
                  <p id="firstName-error" className="text-xs text-destructive" role="alert">{errors.firstName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('app:signup.form.lastName')} *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder={t('app:signup.form.lastNamePlaceholder')}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                  autoComplete="family-name"
                  className={`focus:ring-2 focus:ring-primary focus:ring-offset-1 ${errors.lastName ? "border-destructive" : ""}`}
                />
                {errors.lastName && (
                  <p id="lastName-error" className="text-xs text-destructive" role="alert">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('app:signup.form.email')} *</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('app:signup.form.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                autoComplete="email"
                className={`focus:ring-2 focus:ring-primary focus:ring-offset-1 ${errors.email ? "border-destructive" : ""}`}
              />
              {errors.email && (
                <p id="email-error" className="text-xs text-destructive" role="alert">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">{t('app:signup.form.companyName')}</Label>
              <Input
                id="companyName"
                type="text"
                placeholder={t('app:signup.form.companyPlaceholder')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
                className="focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('app:signup.form.password')} *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('app:signup.form.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={!!errors.password}
                  aria-describedby="password-strength password-error"
                  autoComplete="new-password"
                  className={`pr-10 focus:ring-2 focus:ring-primary focus:ring-offset-1 ${errors.password ? "border-destructive" : ""}`}
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
              <div id="password-strength">
                <PasswordStrengthIndicator 
                  password={password} 
                  isBreached={isBreached}
                  breachCount={breachCount}
                  isCheckingBreach={isCheckingBreach}
                />
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs text-destructive" role="alert">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('app:signup.form.confirmPassword')} *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('app:signup.form.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  autoComplete="new-password"
                  className={`pr-10 focus:ring-2 focus:ring-primary focus:ring-offset-1 ${errors.confirmPassword ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? t('app:accessibility.hidePassword') : t('app:accessibility.showPassword')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-xs text-destructive" role="alert">{errors.confirmPassword}</p>
              )}
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
                  {t('app:signup.form.creating')}
                </>
              ) : isRateLimited ? (
                <>
                  <Clock className="h-4 w-4" />
                  {t('app:rateLimit.cooldownMessage', { time: formatCooldown(cooldownSeconds) })}
                </>
              ) : (
                t('app:signup.form.submit')
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              {t('app:signup.terms')}{" "}
              <a href="#" className="text-primary hover:underline">{t('app:signup.termsOfUse')}</a>
              {" "}{t('app:signup.and')}{" "}
              <a href="#" className="text-primary hover:underline">{t('app:signup.privacyPolicy')}</a>.
            </p>
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

          {/* Google Sign Up */}
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
            aria-label={t('app:signup.continueWithGoogle')}
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
            {t('app:signup.continueWithGoogle')}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t('app:signup.alreadyHaveAccount')}{" "}
            <Link 
              to="/login" 
              className="text-primary hover:underline font-medium"
            >
              {t('app:signup.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
