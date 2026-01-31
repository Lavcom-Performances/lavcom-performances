import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SensitiveAction } from '@/lib/mfa/sensitiveActions';

export interface MfaStatus {
  isEnrolled: boolean;
  factorId: string | null;
}

export interface MfaChallengeResult {
  success: boolean;
  error?: string;
}

interface MfaSession {
  action: string;
  expiresAt: Date;
}

// In-memory session cache (cleared on page refresh)
const mfaSessions = new Map<string, MfaSession>();

/**
 * Check if we have a valid in-memory MFA session for an action
 */
function hasValidLocalSession(action: string): boolean {
  const session = mfaSessions.get(action);
  if (!session) return false;
  
  if (new Date() >= session.expiresAt) {
    mfaSessions.delete(action);
    return false;
  }
  
  return true;
}

/**
 * Store a valid MFA session locally
 */
function storeLocalSession(action: string, expiresAt: string): void {
  mfaSessions.set(action, {
    action,
    expiresAt: new Date(expiresAt),
  });
}

export function useMfaChallenge() {
  const [isChecking, setIsChecking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [pendingActionType, setPendingActionType] = useState<SensitiveAction | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
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

  // Check backend for valid MFA session
  const checkBackendSession = useCallback(async (action: SensitiveAction): Promise<{
    hasSession: boolean;
    enrollmentRequired?: boolean;
    isPlatformAdmin?: boolean;
  }> => {
    try {
      const { data, error } = await supabase.functions.invoke('require-mfa', {
        body: { action, create_challenge: false },
      });

      if (error) {
        console.error('Error checking MFA requirement:', error);
        return { hasSession: false };
      }

      // TAEX-231: If platform admin without MFA enrolled → block
      if (data.enrollment_required) {
        return { 
          hasSession: false, 
          enrollmentRequired: true,
          isPlatformAdmin: data.is_platform_admin,
        };
      }

      // If no MFA enrolled (for non-platform users), allow action
      if (!data.mfa_enrolled) {
        return { hasSession: true };
      }

      // If has valid session, allow action
      return { hasSession: data.has_valid_session };
    } catch (err) {
      console.error('Error in checkBackendSession:', err);
      return { hasSession: false };
    }
  }, []);

  // Verify TOTP code via backend
  const verifyCode = useCallback(async (code: string): Promise<MfaChallengeResult> => {
    if (!pendingActionType) {
      return { success: false, error: 'No pending action' };
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-mfa-challenge', {
        body: {
          action: pendingActionType,
          code,
          challenge_id: challengeId,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Verification failed' };
      }

      // Store session locally for quick access
      if (data.expires_at) {
        storeLocalSession(pendingActionType, data.expires_at);
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      return { success: false, error: message };
    } finally {
      setIsVerifying(false);
    }
  }, [pendingActionType, challengeId]);

  // Gate a sensitive action with MFA verification
  const requireMfaFor = useCallback(async (
    action: () => Promise<void>,
    actionType?: SensitiveAction
  ): Promise<boolean> => {
    // Check local session first (fastest)
    if (actionType && hasValidLocalSession(actionType)) {
      await action();
      return true;
    }

    // If we have an action type, check backend for valid session
    if (actionType) {
      const sessionCheck = await checkBackendSession(actionType);
      
      // TAEX-231: Platform admin without MFA enrolled → throw error
      if (sessionCheck.enrollmentRequired) {
        throw new Error('MFA_ENROLLMENT_REQUIRED');
      }
      
      if (sessionCheck.hasSession) {
        await action();
        return true;
      }

      // Create a challenge record
      const { data } = await supabase.functions.invoke('require-mfa', {
        body: { action: actionType, create_challenge: true },
      });

      if (data?.challenge_id) {
        setChallengeId(data.challenge_id);
      }
    } else {
      // Fallback: check local MFA status
      const status = await checkMfaStatus();
      
      // If MFA is not enrolled, proceed without verification
      if (!status.isEnrolled) {
        await action();
        return true;
      }
    }
    
    // MFA is enrolled and no valid session - show challenge dialog
    setPendingAction(() => action);
    setPendingActionType(actionType || null);
    setShowChallengeDialog(true);
    return false; // Action is pending MFA verification
  }, [checkMfaStatus, checkBackendSession]);

  // Execute pending action after successful verification
  const executePendingAction = useCallback(async () => {
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
      setPendingActionType(null);
      setChallengeId(null);
      setShowChallengeDialog(false);
    }
  }, [pendingAction]);

  // Cancel the pending action
  const cancelChallenge = useCallback(() => {
    setPendingAction(null);
    setPendingActionType(null);
    setChallengeId(null);
    setShowChallengeDialog(false);
  }, []);

  return {
    // State
    isChecking,
    isVerifying,
    showChallengeDialog,
    mfaStatus,
    pendingActionType,
    
    // Actions
    checkMfaStatus,
    verifyCode,
    requireMfaFor,
    executePendingAction,
    cancelChallenge,
    setShowChallengeDialog,
  };
}
