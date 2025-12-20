import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Home, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

export default function ResetPassword() {
  const { t } = useTranslation(['app', 'common']);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // User should have a session after clicking the reset link
      setIsValidSession(!!session);
    };
    checkSession();
  }, []);

  const passwordSchema = z.object({
    password: z.string()
      .min(8, t('app:signup.validation.passwordMin'))
      .regex(/[A-Z]/, t('app:passwordStrength.criteria.hasUppercase'))
      .regex(/[a-z]/, t('app:passwordStrength.criteria.hasLowercase'))
      .regex(/[0-9]/, t('app:passwordStrength.criteria.hasNumber'))
      .regex(/[!@#$%^&*(),.?":{}|<>]/, t('app:passwordStrength.criteria.hasSpecial')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('app:signup.validation.passwordMismatch'),
    path: ["confirmPassword"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const result = passwordSchema.safeParse({ password, confirmPassword });
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

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: t('common:error'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsSuccess(true);
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Invalid session state
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-semibold text-foreground">
              {t('app:resetPassword.invalidLink')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('app:resetPassword.invalidLinkDescription')}
            </p>
          </div>
          <Link to="/forgot-password">
            <Button variant="lavcom" className="w-full">
              {t('app:resetPassword.requestNewLink')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
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
          <div className="mb-10">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Performances" 
              className="w-full max-w-xs mx-auto"
            />
          </div>
        </div>
      </div>

      {/* Right side - Form */}
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

          {isSuccess ? (
            // Success state
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
                  {t('app:resetPassword.successTitle')}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  {t('app:resetPassword.successDescription')}
                </p>
              </div>
              <div className="pt-4">
                <Button 
                  variant="lavcom" 
                  className="w-full"
                  onClick={() => navigate("/login")}
                >
                  {t('app:resetPassword.goToLogin')}
                </Button>
              </div>
            </div>
          ) : (
            // Form state
            <>
              <div className="space-y-1.5 md:space-y-2">
                <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
                  {t('app:resetPassword.title')}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  {t('app:resetPassword.subtitle')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" aria-label={t('app:resetPassword.title')}>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('app:resetPassword.newPassword')}</Label>
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
                    <PasswordStrengthIndicator password={password} />
                  </div>
                  {errors.password && (
                    <p id="password-error" className="text-xs text-destructive" role="alert">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('app:signup.form.confirmPassword')}</Label>
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('app:resetPassword.updating')}
                    </>
                  ) : (
                    t('app:resetPassword.submit')
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
