import { useState, useCallback, ReactNode } from 'react';
import { useMfaChallenge } from './useMfaChallenge';
import { MfaChallengeDialog } from '@/components/auth/MfaChallengeDialog';
import { useToast } from './use-toast';
import { useTranslation } from 'react-i18next';

export type SensitiveActionType = 
  | 'delete'
  | 'export'
  | 'changePassword'
  | 'deleteSite'
  | 'deleteAccount'
  | 'disableMfa';

interface UseMfaGatedActionOptions {
  actionType?: SensitiveActionType;
  customActionLabel?: string;
}

/**
 * Hook to wrap sensitive actions with MFA verification (if MFA is enrolled).
 * 
 * Usage:
 * ```tsx
 * const { executeMfaGated, MfaDialogComponent } = useMfaGatedAction({ actionType: 'delete' });
 * 
 * const handleDelete = async () => {
 *   await executeMfaGated(async () => {
 *     // Your delete logic here
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
    if (options.actionType) {
      return t(`app:mfaChallenge.actionLabels.${options.actionType}`, { defaultValue: '' });
    }
    return undefined;
  }, [options.actionType, options.customActionLabel, t]);

  // Execute an action with MFA verification if enrolled
  const executeMfaGated = useCallback(async (action: () => Promise<void>) => {
    setIsPending(true);
    try {
      const executed = await requireMfaFor(action);
      // If executed is true, action was performed immediately (no MFA enrolled)
      // If false, we're waiting for MFA verification
      if (executed) {
        setIsPending(false);
      }
    } catch (error) {
      setIsPending(false);
      throw error;
    }
  }, [requireMfaFor]);

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
