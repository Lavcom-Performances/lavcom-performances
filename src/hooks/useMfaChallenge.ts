import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MfaStatus {
  isEnrolled: boolean;
  factorId: string | null;
}

export interface MfaChallengeResult {
  success: boolean;
  error?: string;
}

export function useMfaChallenge() {
  const [isChecking, setIsChecking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>({ isEnrolled: false, factorId: null });

  // Check if user has MFA enrolled
  const checkMfaStatus = useCallback(async (): Promise<MfaStatus> => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) {
        console.error('Error checking MFA status:', error);
        return { isEnrolled: false, factorId: null };
      }
      
      const verifiedFactor = data.totp.find(f => f.status === 'verified');
      const status = {
        isEnrolled: !!verifiedFactor,
        factorId: verifiedFactor?.id || null,
      };
      setMfaStatus(status);
      return status;
    } catch (err) {
      console.error('Error in checkMfaStatus:', err);
      return { isEnrolled: false, factorId: null };
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Verify TOTP code
  const verifyCode = useCallback(async (code: string): Promise<MfaChallengeResult> => {
    if (!mfaStatus.factorId) {
      return { success: false, error: 'No MFA factor enrolled' };
    }

    setIsVerifying(true);
    try {
      // First create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaStatus.factorId,
      });

      if (challengeError) {
        return { success: false, error: challengeError.message };
      }

      // Then verify it
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: mfaStatus.factorId,
        challengeId: challengeData.id,
        code,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Verification failed' };
    } finally {
      setIsVerifying(false);
    }
  }, [mfaStatus.factorId]);

  // Gate a sensitive action with MFA verification
  const requireMfaFor = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    const status = await checkMfaStatus();
    
    // If MFA is not enrolled, proceed without verification
    if (!status.isEnrolled) {
      await action();
      return true;
    }
    
    // MFA is enrolled - show challenge dialog
    setPendingAction(() => action);
    setShowChallengeDialog(true);
    return false; // Action is pending MFA verification
  }, [checkMfaStatus]);

  // Execute pending action after successful verification
  const executePendingAction = useCallback(async () => {
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
      setShowChallengeDialog(false);
    }
  }, [pendingAction]);

  // Cancel the pending action
  const cancelChallenge = useCallback(() => {
    setPendingAction(null);
    setShowChallengeDialog(false);
  }, []);

  return {
    // State
    isChecking,
    isVerifying,
    showChallengeDialog,
    mfaStatus,
    
    // Actions
    checkMfaStatus,
    verifyCode,
    requireMfaFor,
    executePendingAction,
    cancelChallenge,
    setShowChallengeDialog,
  };
}
