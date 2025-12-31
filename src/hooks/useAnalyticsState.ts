import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface AnalyticsState {
  site_id: string;
  analytics_version: number;
  last_import_at: string | null;
  last_import_status: string | null;
  updated_at: string;
}

interface UseAnalyticsStateResult {
  /** Current analytics version for the site */
  version: number | null;
  /** Last import timestamp */
  lastImportAt: Date | null;
  /** Last import status */
  lastImportStatus: string | null;
  /** Whether we're connected to realtime */
  isConnected: boolean;
  /** Manually refetch the state */
  refetch: () => Promise<void>;
}

/**
 * Hook to listen to real-time analytics state changes via Supabase Realtime
 * Automatically invalidates queries when analytics version changes
 */
export function useAnalyticsState(): UseAnalyticsStateResult {
  const { currentSiteId } = useCurrentSite();
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<AnalyticsState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [previousVersion, setPreviousVersion] = useState<number | null>(null);

  // Fetch initial state
  const fetchState = useCallback(async () => {
    if (!currentSiteId) return;

    const { data, error } = await supabase
      .from("site_analytics_state")
      .select("*")
      .eq("site_id", currentSiteId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching analytics state:", error);
      return;
    }

    if (data) {
      setState(data as AnalyticsState);
      setPreviousVersion(data.analytics_version);
    }
  }, [currentSiteId]);

  // Invalidate queries when version changes
  const invalidateOnVersionChange = useCallback(
    async (newVersion: number) => {
      if (previousVersion !== null && newVersion > previousVersion) {
        console.log(
          `Analytics version changed: ${previousVersion} -> ${newVersion}. Invalidating queries...`
        );

        // Invalidate all site-related queries
        const queryKeysToInvalidate = [
          ["operations", currentSiteId],
          ["analytics", currentSiteId],
          ["analytics_daily", currentSiteId],
          ["analytics_kpis", currentSiteId],
          ["dashboard_kpis", currentSiteId],
          ["dashboard-stats", currentSiteId],
          ["monthly_revenue", currentSiteId],
          ["monthly_revenue_range", currentSiteId],
          ["calendar_kpis", currentSiteId],
          ["recommendations", currentSiteId],
          ["date_bounds", currentSiteId],
          ["charts", currentSiteId],
          ["profitability", currentSiteId],
        ];

        await Promise.all(
          queryKeysToInvalidate.map((key) =>
            queryClient.invalidateQueries({ queryKey: key })
          )
        );
      }
      setPreviousVersion(newVersion);
    },
    [currentSiteId, previousVersion, queryClient]
  );

  // Subscribe to realtime changes
  useEffect(() => {
    if (!currentSiteId) return;

    // Fetch initial state
    fetchState();

    // Set up realtime subscription
    const channel = supabase
      .channel(`analytics-state-${currentSiteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_analytics_state",
          filter: `site_id=eq.${currentSiteId}`,
        },
        (payload: RealtimePostgresChangesPayload<AnalyticsState>) => {
          console.log("Analytics state change received:", payload);

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newState = payload.new as AnalyticsState;
            setState(newState);

            // Check if version changed and invalidate queries
            if (newState.analytics_version) {
              invalidateOnVersionChange(newState.analytics_version);
            }
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to analytics state for site ${currentSiteId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [currentSiteId, fetchState, invalidateOnVersionChange]);

  return {
    version: state?.analytics_version ?? null,
    lastImportAt: state?.last_import_at ? new Date(state.last_import_at) : null,
    lastImportStatus: state?.last_import_status ?? null,
    isConnected,
    refetch: fetchState,
  };
}
