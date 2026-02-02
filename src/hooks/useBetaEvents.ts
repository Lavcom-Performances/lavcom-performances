import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useActiveLaundromat } from "./useActiveLaundromat";

type BetaEventType =
  | "beta_session_started"
  | "beta_activation_completed"
  | "beta_error_critical"
  | "beta_error_soft"
  | "beta_action_abandoned"
  | "export_requested"
  | "export_failed"
  | "laundromat_closed"
  | "laundromat_reactivated"
  | "active_laundromat_changed"
  | "read_only_block_shown";

/**
 * Hook for logging beta events with automatic context enrichment
 */
export function useBetaEvents() {
  const location = useLocation();
  const { activeLaundromatId } = useActiveLaundromat();

  const logBetaEvent = useCallback(
    async (
      eventType: BetaEventType,
      metadata?: Record<string, unknown>
    ): Promise<void> => {
      try {
        const { error } = await supabase.functions.invoke("log-beta-event", {
          body: {
            event_type: eventType,
            context: location.pathname,
            metadata: {
              ...metadata,
              active_laundromat_id: activeLaundromatId,
            },
          },
        });

        if (error) {
          console.warn("[useBetaEvents] Failed to log event:", error);
        }
      } catch (err) {
        // Silent fail for observability - don't break user flow
        console.warn("[useBetaEvents] Error logging event:", err);
      }
    },
    [location.pathname, activeLaundromatId]
  );

  return { logBetaEvent };
}
