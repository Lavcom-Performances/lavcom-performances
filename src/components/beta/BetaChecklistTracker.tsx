import { useEffect } from "react";
import { useBetaOnboarding } from "@/hooks/useBetaOnboarding";
import { useBetaEvents } from "@/hooks/useBetaEvents";

interface BetaChecklistTrackerProps {
  /** Event type to complete for this page */
  itemId?: "select_laundromat" | "confirm_details" | "first_export" | "send_feedback";
}

/**
 * Component to track checklist completion on specific pages.
 * Add this to pages that should complete a checklist item when visited.
 */
export function BetaChecklistTracker({ itemId }: BetaChecklistTrackerProps) {
  const { isBeta, completeItem } = useBetaOnboarding();

  useEffect(() => {
    if (!isBeta || !itemId) return;
    completeItem(itemId);
  }, [isBeta, itemId, completeItem]);

  return null;
}

/**
 * Hook to manually complete a checklist item.
 * Use this for action-based completion (e.g., after export, after feedback).
 */
export function useBetaChecklistComplete() {
  const { isBeta, completeItem, isChecklistComplete, checklistItems } = useBetaOnboarding();
  const { logBetaEvent } = useBetaEvents();

  const complete = (itemId: string) => {
    if (!isBeta) return;
    completeItem(itemId);

    // Check if this completes the checklist
    const willBeComplete = checklistItems.every(
      item => item.id === itemId || item.completed
    );
    
    if (willBeComplete && !isChecklistComplete) {
      logBetaEvent("beta_activation_completed");
    }
  };

  return { complete, isBeta };
}
