import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Shield, 
  Loader2,
  Mail,
  Key,
  Smartphone,
  AlertTriangle,
  HelpCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLoginSecurity, RiskLevel } from '@/hooks/useLoginSecurity';
import { MfaChallengeDialog } from '@/components/auth/MfaChallengeDialog';
import { LoginHelpPanel } from '@/components/auth/LoginHelpPanel';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { AuthErrorCode, parseAuthErrorCode, generateTraceId } from '@/lib/auth/authErrorCodes';
import { logAuthErrorShown } from '@/lib/auth/loginHelpLogger';
import { supabase } from '@/integrations/supabase/client';

interface RiskLoginVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  riskLevel: RiskLevel;
  reasons: string[];
  mfaEnrolled: boolean;
}

type VerificationMethod = 'email' | 'mfa' | 'recovery';

export function RiskLoginVerificationModal({
  isOpen,
  onClose,
  onVerified,
  riskLevel,
  reasons,
  mfaEnrolled,
}: RiskLoginVerificationModalProps) {
  const { t } = useTranslation(['app', 'common']);
  const { sendLoginOtp, verifyLoginOtp, verifyRecoveryCode, trustDevice, isLoading } = useLoginSecurity();
  
  const [activeTab, setActiveTab] = useState<VerificationMethod>(mfaEnrolled ? 'mfa' : 'email');
  const [otpCode, setOtpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [showMfaDialog, setShowMfaDialog] = useState(false);
  const [isMfaVerifying, setIsMfaVerifying] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [traceId] = useState(() => generateTraceId());
  const [otpFailureCount, setOtpFailureCount] = useState(0);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setOtpCode('');
      setRecoveryCode('');
      setError(null);
      setErrorCode(null);
      setOtpSent(false);
      setRemainingAttempts(null);
      setActiveTab(mfaEnrolled ? 'mfa' : 'email');
      setShowMfaDialog(false);
      setResendCooldown(0);
      setOtpFailureCount(0);
    }
  }, [isOpen, mfaEnrolled]);

  const handleSendOtp = async () => {
    setError(null);
    setErrorCode(null);
    const result = await sendLoginOtp();
    if (result.success) {
      setOtpSent(true);
      setResendCooldown(60); // 60 second cooldown
    } else {
      const code = parseAuthErrorCode(result.error || 'rate limit');
      setErrorCode(code);
      setError(result.error || t('app:securityCenter.riskLogin.sendOtpError'));
      logAuthErrorShown(code, { context: 'verification', trace_id: traceId });
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError(t('app:securityCenter.riskLogin.invalidCodeFormat'));
      setErrorCode('OTP_INVALID');
      return;
    }
    
    setError(null);
    setErrorCode(null);
    const result = await verifyLoginOtp(otpCode);
    
    if (result.success) {
      onVerified();
    } else {
      setOtpFailureCount(prev => prev + 1);
      const code = parseAuthErrorCode(result.error || 'invalid');
      setErrorCode(code);
      setError(result.error || t('app:securityCenter.riskLogin.verifyError'));
      logAuthErrorShown(code, { context: 'verification', trace_id: traceId });
      if (result.remaining_attempts !== undefined) {
        setRemainingAttempts(result.remaining_attempts);
      }
    }
  };

  const handleSwitchToRecovery = () => {
    setActiveTab('recovery');
    setError(null);
    setErrorCode(null);
  };

  const handleVerifyRecoveryCode = async () => {
    if (recoveryCode.replace(/-/g, '').length !== 8) {
      setError(t('app:securityCenter.riskLogin.invalidRecoveryFormat'));
      return;
    }
    
    setError(null);
    const result = await verifyRecoveryCode(recoveryCode);
    
    if (result.success) {
      onVerified();
    } else {
      setError(result.error || t('app:securityCenter.riskLogin.verifyError'));
    }
  };

  const handleMfaVerify = async (code: string): Promise<{ success: boolean; error?: string }> => {
    setIsMfaVerifying(true);
    try {
      // Get the user's MFA factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');
      
      if (!totpFactor) {
        return { success: false, error: t('app:mfa.noFactorEnrolled') };
      }
      
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      
      if (challengeError || !challengeData) {
        return { success: false, error: challengeError?.message || 'Challenge failed' };
      }
      
      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });
      
      if (verifyError) {
        return { success: false, error: verifyError.message };
      }
      
      // Trust the device after successful MFA
      await trustDevice();
      
      return { success: true };
    } catch (err) {
      console.error('[RiskLoginVerification] MFA verification error:', err);
      return { success: false, error: 'Verification failed' };
    } finally {
      setIsMfaVerifying(false);
    }
  };

  const handleMfaSuccess = () => {
    setShowMfaDialog(false);
    onVerified();
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'NEW_DEVICE':
        return t('app:securityCenter.riskLogin.reasons.newDevice');
      case 'NEW_COUNTRY':
        return t('app:securityCenter.riskLogin.reasons.newCountry');
      case 'NEW_IP':
        return t('app:securityCenter.riskLogin.reasons.newIp');
      default:
        return reason;
    }
  };

  // Determine the grid columns based on available tabs
  const tabCount = mfaEnrolled ? 3 : 2;

  return (
    <>
      <Dialog open={isOpen && !showMfaDialog} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                riskLevel === 'high' ? 'bg-destructive/10' : 'bg-amber-500/10'
              }`}>
                <Shield className={`h-5 w-5 ${
                  riskLevel === 'high' ? 'text-destructive' : 'text-amber-600'
                }`} />
              </div>
              <div>
                <DialogTitle>{t('app:securityCenter.riskLogin.title')}</DialogTitle>
                <DialogDescription>
                  {t('app:securityCenter.riskLogin.description')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Risk reasons */}
          {reasons.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {reasons.map((reason) => (
                <div 
                  key={reason}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-sm"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {getReasonLabel(reason)}
                </div>
              ))}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VerificationMethod)}>
            <TabsList className={`grid w-full ${tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {mfaEnrolled && (
                <TabsTrigger value="mfa" className="gap-1">
                  <Smartphone className="h-3 w-3" />
                  {t('app:securityCenter.riskLogin.tabs.mfa')}
                </TabsTrigger>
              )}
              <TabsTrigger value="email" className="gap-1">
                <Mail className="h-3 w-3" />
                {t('app:securityCenter.riskLogin.tabs.email')}
              </TabsTrigger>
              <TabsTrigger value="recovery" className="gap-1">
                <Key className="h-3 w-3" />
                {t('app:securityCenter.riskLogin.tabs.recovery')}
              </TabsTrigger>
            </TabsList>

            {/* MFA Tab */}
            {mfaEnrolled && (
              <TabsContent value="mfa" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('app:securityCenter.riskLogin.mfaDescription')}
                </p>
                <Button 
                  onClick={() => setShowMfaDialog(true)} 
                  className="w-full gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  {t('app:securityCenter.riskLogin.verifyWithMfa')}
                </Button>
              </TabsContent>
            )}

            {/* Email OTP Tab */}
            <TabsContent value="email" className="space-y-4 pt-4">
              {!otpSent ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('app:securityCenter.riskLogin.emailDescription')}
                  </p>
                  <Button 
                    onClick={handleSendOtp} 
                    disabled={isLoading}
                    className="w-full gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {t('app:securityCenter.riskLogin.sendCode')}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="otp">{t('app:securityCenter.riskLogin.enterCode')}</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-2xl tracking-widest font-mono"
                    />
                    {remainingAttempts !== null && remainingAttempts <= 2 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {t('app:securityCenter.riskLogin.attemptsRemaining', { count: remainingAttempts })}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleSendOtp} 
                      disabled={isLoading || resendCooldown > 0}
                      className="flex-1 gap-1"
                    >
                      {resendCooldown > 0 ? (
                        <>
                          <Clock className="h-3 w-3" />
                          {resendCooldown}s
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          {t('app:securityCenter.riskLogin.resendCode')}
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleVerifyOtp} 
                      disabled={isLoading || otpCode.length !== 6}
                      className="flex-1"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {t('app:securityCenter.riskLogin.verify')}
                    </Button>
                  </div>
                  
                  {/* Suggest recovery code after 3 failures */}
                  {otpFailureCount >= 3 && (
                    <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                      <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {t('app:loginHelp.suggestRecoveryCode')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSwitchToRecovery}
                        className="shrink-0"
                      >
                        {t('app:loginHelp.useRecoveryCode')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Recovery Code Tab */}
            <TabsContent value="recovery" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                {t('app:securityCenter.riskLogin.recoveryDescription')}
              </p>
              <div className="space-y-2">
                <Label htmlFor="recovery">{t('app:securityCenter.riskLogin.enterRecoveryCode')}</Label>
                <Input
                  id="recovery"
                  type="text"
                  placeholder="XXXX-XXXX"
                  value={recoveryCode}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                    // Auto-add dash
                    if (value.length === 4 && !value.includes('-')) {
                      value = value + '-';
                    }
                    setRecoveryCode(value.slice(0, 9));
                  }}
                  className="text-center text-lg tracking-widest font-mono"
                />
              </div>
              <Button 
                onClick={handleVerifyRecoveryCode} 
                disabled={isLoading || recoveryCode.replace(/-/g, '').length !== 8}
                className="w-full"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('app:securityCenter.riskLogin.verify')}
              </Button>
            </TabsContent>
          </Tabs>

          {/* Error display with AuthErrorBanner */}
          {errorCode && error && (
            <AuthErrorBanner
              errorCode={errorCode}
              message={error}
              traceId={traceId}
              onSwitchToRecovery={handleSwitchToRecovery}
              onContactSupport={() => setShowHelpPanel(true)}
              compact
            />
          )}

          {/* Need Help link */}
          <button
            type="button"
            onClick={() => setShowHelpPanel(true)}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <HelpCircle className="h-4 w-4" />
            {t('common:needHelp')}
          </button>
        </DialogContent>
      </Dialog>

      {/* MFA Challenge Dialog */}
      <MfaChallengeDialog
        open={showMfaDialog}
        onOpenChange={setShowMfaDialog}
        onVerify={handleMfaVerify}
        onSuccess={handleMfaSuccess}
        onCancel={() => setShowMfaDialog(false)}
        isVerifying={isMfaVerifying}
        actionLabel={t('app:securityCenter.riskLogin.title')}
      />

      {/* Login Help Panel */}
      <LoginHelpPanel
        open={showHelpPanel}
        onOpenChange={setShowHelpPanel}
        onSwitchToRecovery={handleSwitchToRecovery}
        onResendOtp={async () => {
          const result = await sendLoginOtp();
          if (result.success) setResendCooldown(60);
          return result;
        }}
        isResending={isLoading}
        context="verification"
        lastErrorCode={errorCode || undefined}
      />
    </>
  );
}
