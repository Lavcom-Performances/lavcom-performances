import { useState, useEffect } from "react";
import { Shield, Loader2, CheckCircle2, XCircle, Smartphone, Key, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { ReAuthDialog } from "./ReAuthDialog";

interface MFASetupProps {
  onMFAChange?: (enabled: boolean) => void;
}

export function MFASetup({ onMFAChange }: MFASetupProps) {
  const { t } = useTranslation(['app', 'common']);
  const { toast } = useToast();
  
  const [isMFAEnabled, setIsMFAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  
  // Setup dialog state
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  
  // Disable dialog state
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showReAuthDialog, setShowReAuthDialog] = useState(false);

  // Check MFA status on mount
  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;
      
      // Check if there's a verified TOTP factor
      const verifiedFactor = data.totp.find(f => f.status === 'verified');
      setIsMFAEnabled(!!verifiedFactor);
      
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
      }
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEnrollment = async () => {
    setIsEnrolling(true);
    setVerificationError("");
    
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Lavcom Performances TOTP',
      });
      
      if (error) throw error;
      
      if (data.totp) {
        setQrCodeUrl(data.totp.qr_code);
        setSecretKey(data.totp.secret);
        setFactorId(data.id);
        setShowSetupDialog(true);
      }
    } catch (error: any) {
      toast({
        title: t('common:error'),
        description: error.message || t('app:mfa.enrollError'),
        variant: "destructive",
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      setVerificationError(t('app:mfa.invalidCodeLength'));
      return;
    }
    
    setIsVerifying(true);
    setVerificationError("");
    
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verificationCode,
      });
      
      if (error) throw error;
      
      setIsMFAEnabled(true);
      setShowSetupDialog(false);
      setVerificationCode("");
      onMFAChange?.(true);
      
      toast({
        title: t('app:mfa.enabledSuccess'),
        description: t('app:mfa.enabledSuccessDescription'),
      });
    } catch (error: any) {
      if (error.message?.includes('Invalid')) {
        setVerificationError(t('app:mfa.invalidCode'));
      } else {
        setVerificationError(error.message || t('app:mfa.verifyError'));
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableMFA = async () => {
    // First require re-authentication
    setShowReAuthDialog(true);
  };

  const handleReAuthSuccess = () => {
    setShowDisableDialog(true);
  };

  const confirmDisableMFA = async () => {
    setIsDisabling(true);
    
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      
      if (error) throw error;
      
      setIsMFAEnabled(false);
      setShowDisableDialog(false);
      setFactorId("");
      onMFAChange?.(false);
      
      toast({
        title: t('app:mfa.disabledSuccess'),
        description: t('app:mfa.disabledSuccessDescription'),
      });
    } catch (error: any) {
      toast({
        title: t('common:error'),
        description: error.message || t('app:mfa.disableError'),
        variant: "destructive",
      });
    } finally {
      setIsDisabling(false);
    }
  };

  const copySecretKey = async () => {
    try {
      await navigator.clipboard.writeText(secretKey);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      toast({
        title: t('common:error'),
        description: t('app:mfa.copyError'),
        variant: "destructive",
      });
    }
  };

  const handleCloseSetupDialog = () => {
    // Unenroll the factor if not verified
    if (factorId && !isMFAEnabled) {
      supabase.auth.mfa.unenroll({ factorId }).catch(() => {});
    }
    setShowSetupDialog(false);
    setQrCodeUrl("");
    setSecretKey("");
    setVerificationCode("");
    setVerificationError("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t('app:mfa.title')}
                  {isMFAEnabled && (
                    <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('app:mfa.enabled')}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {t('app:mfa.description')}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status and info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {t('app:mfa.appSuggestion')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('app:mfa.appExamples')}
            </p>
          </div>

          {/* Action button */}
          {isMFAEnabled ? (
            <Button
              onClick={handleDisableMFA}
              variant="outline"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('app:mfa.disable')}
            </Button>
          ) : (
            <Button
              onClick={handleStartEnrollment}
              variant="lavcom"
              className="w-full"
              disabled={isEnrolling}
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('app:mfa.enrolling')}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  {t('app:mfa.enable')}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={handleCloseSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t('app:mfa.setupTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('app:mfa.setupDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1: QR Code */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                  1
                </span>
                {t('app:mfa.step1')}
              </div>
              
              {qrCodeUrl && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code for MFA" 
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}
              
              {/* Manual entry option */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  {t('app:mfa.cantScanQR')}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={secretKey}
                    readOnly
                    className="font-mono text-xs bg-muted"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copySecretKey}
                    className="shrink-0"
                  >
                    {secretCopied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Verify */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                  2
                </span>
                {t('app:mfa.step2')}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="verification-code">
                  {t('app:mfa.enterCode')}
                </Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setVerificationCode(value);
                    setVerificationError("");
                  }}
                  className={`text-center text-2xl font-mono tracking-widest ${verificationError ? "border-destructive" : ""}`}
                />
                {verificationError && (
                  <p className="text-xs text-destructive text-center">{verificationError}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseSetupDialog}
              disabled={isVerifying}
            >
              {t('common:cancel')}
            </Button>
            <Button
              variant="lavcom"
              onClick={handleVerifyAndEnable}
              disabled={isVerifying || verificationCode.length !== 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('app:mfa.verifying')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t('app:mfa.verifyAndEnable')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-auth Dialog */}
      <ReAuthDialog
        open={showReAuthDialog}
        onOpenChange={setShowReAuthDialog}
        onSuccess={handleReAuthSuccess}
        title={t('app:mfa.reAuthTitle')}
        description={t('app:mfa.reAuthDescription')}
      />

      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {t('app:mfa.disableTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('app:mfa.disableWarning')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDisableDialog(false)}
              disabled={isDisabling}
            >
              {t('common:cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDisableMFA}
              disabled={isDisabling}
            >
              {isDisabling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('app:mfa.disabling')}
                </>
              ) : (
                t('app:mfa.confirmDisable')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
