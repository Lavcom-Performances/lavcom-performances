import { useState, useCallback, ReactNode } from 'react';
import { useMfaChallenge } from './useMfaChallenge';
import { MfaChallengeDialog } from '@/components/auth/MfaChallengeDialog';
import { useToast } from './use-toast';
import { useTranslation } from 'react-i18next';
import type { SensitiveAction } from '@/lib/mfa/sensitiveActions';
import { getActionLabelKey, isSensitiveAction } from '@/lib/mfa/sensitiveActions';

export type { SensitiveAction };

interface UseMfaGatedActionOptions {
  /** The sensitive action type for backend session tracking */
  actionType?: SensitiveAction;
  /** Custom label override (uses i18n by default) */
  customActionLabel?: string;
}

/**
 * Hook to wrap sensitive actions with MFA verification (if MFA is enrolled).
 * 
 * Now with backend session tracking - verified actions are valid for 15 minutes.
 * 
 * Usage:
 * ```tsx
 * const { executeMfaGated, MfaDialogComponent } = useMfaGatedAction({ 
 *   actionType: 'delete_site' 
 * });
 * 
 * const handleDelete = async () => {
 *   await executeMfaGated(async () => {
 *     await deleteItem(id);
 *   });
 * };
 * 
 * return (
 *   <>
 *     <Button onClick={handleDelete}>Delete</Button>
 *     {MfaDialogComponent}
 *   </>
 * );
 * ```
 */
export function useMfaGatedAction(options: UseMfaGatedActionOptions = {}) {
  const { t } = useTranslation(['app']);
  const { toast } = useToast();
  const {
    isVerifying,
    showChallengeDialog,
    mfaStatus,
    pendingActionType,
    verifyCode,
    requireMfaFor,
    executePendingAction,
    cancelChallenge,
    setShowChallengeDialog,
  } = useMfaChallenge();

  const [isPending, setIsPending] = useState(false);

  // Get localized action label
  const getActionLabel = useCallback((): string | undefined => {
    if (options.customActionLabel) {
      return options.customActionLabel;
    }
    
    // Use pending action type if available (for dynamic actions)
    const actionType = pendingActionType || options.actionType;
    
    if (actionType && isSensitiveAction(actionType)) {
      const key = getActionLabelKey(actionType);
      const translated = t(key, { defaultValue: '' });
      return translated || undefined;
    }
    
    return undefined;
  }, [options.actionType, options.customActionLabel, pendingActionType, t]);

  // Execute an action with MFA verification if enrolled
  const executeMfaGated = useCallback(async (
    action: () => Promise<void>,
    /** Override action type for this specific call */
    overrideActionType?: SensitiveAction
  ) => {
    setIsPending(true);
    try {
      const actionType = overrideActionType || options.actionType;
      const executed = await requireMfaFor(action, actionType);
      
      // If executed is true, action was performed immediately (no MFA needed)
      // If false, we're waiting for MFA verification
      if (executed) {
        setIsPending(false);
      }
    } catch (error) {
      setIsPending(false);
      throw error;
    }
  }, [requireMfaFor, options.actionType]);

  // Handle successful verification
  const handleVerifySuccess = useCallback(async () => {
    try {
      await executePendingAction();
      toast({
        title: t('app:mfaChallenge.success'),
      });
    } catch (error) {
      console.error('Error executing action after MFA:', error);
    } finally {
      setIsPending(false);
    }
  }, [executePendingAction, t, toast]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    cancelChallenge();
    setIsPending(false);
  }, [cancelChallenge]);

  // The MFA dialog component to render
  const MfaDialogComponent: ReactNode = (
    <MfaChallengeDialog
      open={showChallengeDialog}
      onOpenChange={setShowChallengeDialog}
      onVerify={verifyCode}
      onSuccess={handleVerifySuccess}
      onCancel={handleCancel}
      isVerifying={isVerifying}
      actionLabel={getActionLabel()}
    />
  );

  return {
    /** Execute an action with MFA verification if enrolled */
    executeMfaGated,
    /** Whether the action is pending (waiting for MFA or executing) */
    isPending,
    /** Whether user has MFA enrolled */
    isMfaEnrolled: mfaStatus.isEnrolled,
    /** The MFA dialog component - render this in your component */
    MfaDialogComponent,
  };
}
