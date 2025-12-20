import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Home, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";
import { useTranslation } from "react-i18next";
import { z } from "zod";

export default function ForgotPassword() {
  const { t } = useTranslation(['app', 'common']);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const emailSchema = z.string().email(t('app:signup.validation.invalidEmail'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (resetError) {
      toast({
        title: t('common:error'),
        description: resetError.message,
        variant: "destructive",
      });
      return;
    }

    setIsSuccess(true);
  };

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Back to home button */}
      <Link 
        to="/" 
        className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border border-border"
      >
        <Home className="h-3.5 w-3.5 md:h-4 md:w-4" />
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
          
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground">
                {t('app:forgotPassword.securityTitle')}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('app:forgotPassword.securityDescription')}
            </p>
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
                  {t('app:forgotPassword.successTitle')}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  {t('app:forgotPassword.successDescription', { email })}
                </p>
              </div>
              <div className="pt-4">
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('app:forgotPassword.backToLogin')}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // Form state
            <>
              <div className="space-y-1.5 md:space-y-2">
                <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
                  {t('app:forgotPassword.title')}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  {t('app:forgotPassword.subtitle')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('app:login.form.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('app:login.form.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`h-11 ${error ? "border-destructive" : ""}`}
                  />
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
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
                      {t('app:forgotPassword.sending')}
                    </>
                  ) : (
                    t('app:forgotPassword.submit')
                  )}
                </Button>
              </form>

              <div className="pt-4">
                <Link to="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('app:forgotPassword.backToLogin')}
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
