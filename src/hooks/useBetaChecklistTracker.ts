import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useBetaOnboarding } from "@/hooks/useBetaOnboarding";
import { useActiveLaundromat } from "@/hooks/useActiveLaundromat";
import { useBetaEvents } from "@/hooks/useBetaEvents";

/**
 * Hook to automatically track checklist completion based on user actions.
 * Should be called from a component that renders on all protected routes.
 */
export function useBetaChecklistTracker() {
  const location = useLocation();
  const { isBeta, completeItem, isChecklistComplete, checklistItems } = useBetaOnboarding();
  const { activeLaundromatId } = useActiveLaundromat();
  const { logBetaEvent } = useBetaEvents();

  // Track laundromat selection
  useEffect(() => {
    if (!isBeta) return;
    
    // Check if laundromat is selected (not null and not 'all')
    if (activeLaundromatId && activeLaundromatId !== 'all') {
      completeItem("select_laundromat");
    }
  }, [isBeta, activeLaundromatId, completeItem]);

  // Track page visits for checklist completion
  useEffect(() => {
    if (!isBeta) return;

    const path = location.pathname;

    // Laundromat settings page visited
    if (path === "/laundromat-settings") {
      completeItem("confirm_details");
    }

    // Beta rules page viewed
    if (path === "/beta") {
      completeItem("view_beta_rules");
    }
  }, [isBeta, location.pathname, completeItem]);

  // Log beta_activation_completed when all items are done
  useEffect(() => {
    if (!isBeta || !isChecklistComplete) return;

    // Check if all items are actually complete
    const allComplete = checklistItems.every(item => item.completed);
    if (allComplete) {
      logBetaEvent("beta_activation_completed");
    }
  }, [isBeta, isChecklistComplete, checklistItems, logBetaEvent]);
}
