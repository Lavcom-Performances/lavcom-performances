import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Shield, 
  Loader2,
  Mail,
  Key,
  Smartphone,
  AlertTriangle,
  X
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

// MFA Challenge will be handled inline for simplicity
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
  const { sendLoginOtp, verifyLoginOtp, verifyRecoveryCode, isLoading } = useLoginSecurity();
  
  const [activeTab, setActiveTab] = useState<VerificationMethod>(mfaEnrolled ? 'mfa' : 'email');
  const [otpCode, setOtpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [showMfaDialog, setShowMfaDialog] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setOtpCode('');
      setRecoveryCode('');
      setError(null);
      setOtpSent(false);
      setRemainingAttempts(null);
      setActiveTab(mfaEnrolled ? 'mfa' : 'email');
    }
  }, [isOpen, mfaEnrolled]);

  const handleSendOtp = async () => {
    setError(null);
    const result = await sendLoginOtp();
    if (result.success) {
      setOtpSent(true);
    } else {
      setError(result.error || t('app:securityCenter.riskLogin.sendOtpError'));
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError(t('app:securityCenter.riskLogin.invalidCodeFormat'));
      return;
    }
    
    setError(null);
    const result = await verifyLoginOtp(otpCode);
    
    if (result.success) {
      onVerified();
    } else {
      setError(result.error || t('app:securityCenter.riskLogin.verifyError'));
      if (result.remaining_attempts !== undefined) {
        setRemainingAttempts(result.remaining_attempts);
      }
    }
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
                  className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded text-sm"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {getReasonLabel(reason)}
                </div>
              ))}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VerificationMethod)}>
            <TabsList className="grid w-full grid-cols-3">
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
                      <p className="text-xs text-amber-600">
                        {t('app:securityCenter.riskLogin.attemptsRemaining', { count: remainingAttempts })}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleSendOtp} 
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {t('app:securityCenter.riskLogin.resendCode')}
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

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MFA Challenge - TODO: Integrate with existing MFA system */}
    </>
  );
}
