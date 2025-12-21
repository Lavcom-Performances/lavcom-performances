import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Loader2, RefreshCw, CheckCircle2, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";

const RESEND_COOLDOWN_SECONDS = 60;
const STORAGE_KEY = "email_verification_last_resend";

interface EmailVerificationRequiredProps {
  email: string;
  onLogout: () => void;
}

export function EmailVerificationRequired({ email, onLogout }: EmailVerificationRequiredProps) {
  const { t } = useTranslation(['app', 'common']);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Check for existing cooldown on mount
  useEffect(() => {
    const lastResend = localStorage.getItem(STORAGE_KEY);
    if (lastResend) {
      const elapsed = Math.floor((Date.now() - parseInt(lastResend)) / 1000);
      const remaining = RESEND_COOLDOWN_SECONDS - elapsed;
      if (remaining > 0) {
        setCooldownSeconds(remaining);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleResendEmail = async () => {
    if (cooldownSeconds > 0) return;
    
    setIsResending(true);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      }
    });
    
    setIsResending(false);
    
    if (error) {
      toast({
        title: t('common:error'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    // Set cooldown
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    
    toast({
      title: t('app:emailVerification.resendSuccess'),
      description: t('app:emailVerification.resendSuccessDescription'),
    });
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    
    // Refresh the session to check if email was confirmed
    const { data, error } = await supabase.auth.refreshSession();
    
    setIsCheckingStatus(false);
    
    if (error) {
      toast({
        title: t('common:error'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    if (data.user?.email_confirmed_at) {
      toast({
        title: t('app:emailVerification.verified'),
        description: t('app:emailVerification.verifiedDescription'),
      });
      // Reload the page to proceed
      window.location.reload();
    } else {
      toast({
        title: t('app:emailVerification.notYetVerified'),
        description: t('app:emailVerification.notYetVerifiedDescription'),
      });
    }
  };

  const isRateLimited = cooldownSeconds > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <img 
            src={lavcomLogo} 
            alt="Lavcom Performances" 
            className="w-48 mx-auto mb-8"
          />
        </div>

        <Card className="border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">
              {t('app:emailVerification.title')}
            </CardTitle>
            <CardDescription className="text-base">
              {t('app:emailVerification.description')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Email display */}
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {t('app:emailVerification.sentTo')}
              </p>
              <p className="font-medium text-foreground break-all">
                {email}
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{t('app:emailVerification.instructions1')}</p>
              <p>{t('app:emailVerification.instructions2')}</p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Check status button */}
              <Button
                onClick={handleCheckStatus}
                variant="lavcom"
                className="w-full"
                disabled={isCheckingStatus}
              >
                {isCheckingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('app:emailVerification.checking')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t('app:emailVerification.checkStatus')}
                  </>
                )}
              </Button>

              {/* Resend email button */}
              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full"
                disabled={isResending || isRateLimited}
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('app:emailVerification.resending')}
                  </>
                ) : isRateLimited ? (
                  <>
                    <Clock className="h-4 w-4" />
                    {t('app:emailVerification.resendCooldown', { seconds: cooldownSeconds })}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    {t('app:emailVerification.resendEmail')}
                  </>
                )}
              </Button>

              {/* Logout button */}
              <Button
                onClick={onLogout}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                {t('app:emailVerification.useAnotherAccount')}
              </Button>
            </div>

            {/* Help text */}
            <p className="text-xs text-center text-muted-foreground">
              {t('app:emailVerification.helpText')}{" "}
              <a href="mailto:support@lavcom.fr" className="text-primary hover:underline">
                {t('common:contactSupport')}
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
