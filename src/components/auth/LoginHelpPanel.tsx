/**
 * LoginHelpPanel - Self-serve help drawer for login issues
 * 
 * Three sections:
 * 1. Email OTP issues (resend, checklist)
 * 2. Lost authenticator (recovery code option)
 * 3. Account at risk (security center, session management)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Mail, 
  Key, 
  Shield, 
  Loader2, 
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';
import { supabase } from '@/integrations/supabase/client';
import { logLoginHelpEvent } from '@/lib/auth/loginHelpLogger';
import { AuthErrorCode, generateTraceId } from '@/lib/auth/authErrorCodes';

interface LoginHelpPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user wants to switch to recovery code input */
  onSwitchToRecovery?: () => void;
  /** Called when user requests OTP resend */
  onResendOtp?: () => Promise<{ success: boolean; error?: string }>;
  /** Whether OTP resend is in progress */
  isResending?: boolean;
  /** Current context: 'login' | 'verification' */
  context?: 'login' | 'verification';
  /** Last error code for support prefill */
  lastErrorCode?: AuthErrorCode;
  /** User email for support prefill (if known) */
  userEmail?: string;
}

// Resend cooldown in seconds
const RESEND_COOLDOWN = 60;

export function LoginHelpPanel({
  open,
  onOpenChange,
  onSwitchToRecovery,
  onResendOtp,
  isResending = false,
  context = 'login',
  lastErrorCode,
  userEmail,
}: LoginHelpPanelProps) {
  const { t } = useTranslation(['app', 'common']);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { deviceId } = useDeviceFingerprint();
  
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [traceId] = useState(() => generateTraceId());

  // Log when panel opens
  useEffect(() => {
    if (open) {
      logLoginHelpEvent('LOGIN_HELP_OPENED', {
        device_id: deviceId,
        context,
        trace_id: traceId,
      });
    }
  }, [open, deviceId, context, traceId]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    if (!onResendOtp || resendCooldown > 0 || isResending) return;

    logLoginHelpEvent('OTP_RESEND_CLICKED', {
      device_id: deviceId,
      context,
      trace_id: traceId,
    });

    const result = await onResendOtp();
    
    if (result.success) {
      setResendSuccess(true);
      setResendCooldown(RESEND_COOLDOWN);
      toast({
        title: t('app:loginHelp.otpResent'),
        description: t('app:loginHelp.checkEmail'),
      });
      // Reset success state after 3 seconds
      setTimeout(() => setResendSuccess(false), 3000);
    } else {
      toast({
        title: t('common:error'),
        description: result.error || t('app:loginHelp.resendFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleSwitchToRecovery = () => {
    logLoginHelpEvent('RECOVERY_HELP_SELECTED', {
      device_id: deviceId,
      context,
      trace_id: traceId,
    });

    onSwitchToRecovery?.();
    onOpenChange(false);
  };

  const handleContactSupport = () => {
    logLoginHelpEvent('SUPPORT_ESCALATION_CLICKED', {
      device_id: deviceId,
      context,
      trace_id: traceId,
      error_code: lastErrorCode,
    });

    // Build prefilled URL for contact form
    const params = new URLSearchParams({
      topic: 'bug',
      category: 'login_verification',
      ...(userEmail && { email: userEmail }),
      ...(traceId && { trace_id: traceId }),
      ...(lastErrorCode && { error_code: lastErrorCode }),
    });

    // Navigate to contact section on landing page
    window.open(`/#contact?${params.toString()}`, '_blank');
  };

  const handleRevokeSessions = async () => {
    if (!isAuthenticated) return;
    
    setIsRevokingSessions(true);
    try {
      const { error } = await supabase.functions.invoke('revoke-other-sessions', {
        body: { current_device_id: deviceId },
      });

      if (error) throw error;

      toast({
        title: t('app:securityHealth.actions.sessionsRevoked'),
        description: t('app:securityHealth.actions.sessionsRevokedDescription'),
      });
    } catch (error) {
      console.error('[LoginHelpPanel] Failed to revoke sessions:', error);
      toast({
        title: t('common:error'),
        description: t('app:loginHelp.revokeSessionsFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsRevokingSessions(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t('app:loginHelp.title')}
          </SheetTitle>
          <SheetDescription>
            {t('app:loginHelp.description')}
          </SheetDescription>
        </SheetHeader>

        <Accordion type="single" collapsible className="w-full space-y-2">
          {/* Section 1: Email OTP Issues */}
          <AccordionItem value="email-otp" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium text-sm">
                  {t('app:loginHelp.sections.emailOtp.title')}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4 space-y-4">
              {/* Resend button */}
              {onResendOtp && (
                <Button
                  onClick={handleResendOtp}
                  disabled={isResending || resendCooldown > 0}
                  variant={resendSuccess ? 'default' : 'outline'}
                  className="w-full gap-2"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('app:loginHelp.sending')}
                    </>
                  ) : resendSuccess ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {t('app:loginHelp.otpResent')}
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <Clock className="h-4 w-4" />
                      {t('app:loginHelp.resendIn', { seconds: resendCooldown })}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      {t('app:loginHelp.resendCode')}
                    </>
                  )}
                </Button>
              )}

              {/* Checklist */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t('app:loginHelp.sections.emailOtp.checklist.title')}
                </p>
                <ul className="space-y-2">
                  {['checkSpam', 'confirmEmail', 'wait'].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{t(`app:loginHelp.sections.emailOtp.checklist.${item}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2: Lost MFA/Authenticator */}
          <AccordionItem value="lost-mfa" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Key className="h-4 w-4 text-amber-600" />
                </div>
                <span className="font-medium text-sm">
                  {t('app:loginHelp.sections.lostMfa.title')}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('app:loginHelp.sections.lostMfa.description')}
              </p>

              {/* Switch to recovery code */}
              {onSwitchToRecovery && context === 'verification' && (
                <Button
                  onClick={handleSwitchToRecovery}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Key className="h-4 w-4" />
                  {t('app:loginHelp.useRecoveryCode')}
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              )}

              {/* Link to security settings if logged in */}
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-muted-foreground"
                  onClick={() => window.open('/settings/security', '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('app:loginHelp.sections.lostMfa.generateNewCodes')}
                </Button>
              )}

              {/* Warning about recovery codes */}
              <div className="flex items-start gap-2 p-3 bg-accent rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {t('app:loginHelp.sections.lostMfa.warning')}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3: Account at Risk */}
          <AccordionItem value="account-risk" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-destructive" />
                </div>
                <span className="font-medium text-sm">
                  {t('app:loginHelp.sections.accountRisk.title')}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('app:loginHelp.sections.accountRisk.description')}
              </p>

              {isAuthenticated ? (
                <>
                  {/* Open Security Center */}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => window.open('/settings/security', '_blank')}
                  >
                    <Shield className="h-4 w-4" />
                    {t('app:loginHelp.sections.accountRisk.openSecurityCenter')}
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </Button>

                  {/* Revoke sessions */}
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={handleRevokeSessions}
                    disabled={isRevokingSessions}
                  >
                    {isRevokingSessions ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {t('app:loginHelp.sections.accountRisk.logoutOtherSessions')}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t('app:loginHelp.sections.accountRisk.loginFirst')}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Support Escalation */}
        <div className="mt-6 pt-6 border-t space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('app:loginHelp.stillStuck')}
          </p>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleContactSupport}
          >
            <ExternalLink className="h-4 w-4" />
            {t('common:contactSupport')}
          </Button>
          {traceId && (
            <p className="text-xs text-center text-muted-foreground">
              {t('app:loginHelp.referenceId')}: <code className="font-mono">{traceId}</code>
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
