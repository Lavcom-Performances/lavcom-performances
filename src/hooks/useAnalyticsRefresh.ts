import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Hook to manage global analytics refresh after data changes (e.g., CSV import)
 * Invalidates all site-related caches and bumps analytics version
 */
export function useAnalyticsRefresh() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all analytics-related queries for a specific site
   */
  const invalidateSiteQueries = useCallback(
    async (siteId: string) => {
      // List of all query key prefixes that depend on site data
      const queryKeysToInvalidate = [
        ["operations", siteId],
        ["analytics", siteId],
        ["analytics_daily", siteId],
        ["analytics_kpis", siteId],
        ["dashboard_kpis", siteId],
        ["dashboard-stats", siteId],
        ["monthly_revenue", siteId],
        ["monthly_revenue_range", siteId],
        ["calendar_kpis", siteId],
        ["recommendations", siteId],
        ["date_bounds", siteId],
        ["charts", siteId],
        ["profitability", siteId],
        ["import_batches", siteId],
        ["site_costs", siteId],
        // Generic keys that may include site data
        ["operations"],
        ["analytics"],
        ["dashboard"],
        ["recommendations"],
        ["charts"],
      ];

      // Invalidate all matching queries
      await Promise.all(
        queryKeysToInvalidate.map((key) =>
          queryClient.invalidateQueries({ queryKey: key })
        )
      );
    },
    [queryClient]
  );

  /**
   * Bump analytics version in database and invalidate all caches
   * Call this after successful import
   */
  const refreshAnalytics = useCallback(
    async (siteId: string, status: string = "success") => {
      try {
        // 1. Bump version in database
        const { data: newVersion, error } = await supabase.rpc(
          "bump_analytics_version",
          {
            p_site_id: siteId,
            p_status: status,
          }
        );

        if (error) {
          console.error("Error bumping analytics version:", error);
          // Continue with cache invalidation even if version bump fails
        } else {
          console.log(`Analytics version bumped to ${newVersion} for site ${siteId}`);
        }

        // 2. Invalidate all site-related queries
        await invalidateSiteQueries(siteId);

        // 3. Trigger compute-analytics if needed (async, don't wait)
        supabase.functions
          .invoke("compute-analytics", {
            body: {
              site_id: siteId,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              // Compute for last 90 days by default
              start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              end_date: new Date().toISOString().split("T")[0],
            },
          })
          .then(({ error }) => {
            if (error) {
              console.warn("Analytics computation triggered but may have failed:", error);
            } else {
              console.log("Analytics computation triggered successfully");
            }
          })
          .catch((err) => {
            console.warn("Error triggering analytics computation:", err);
          });

        return { success: true, version: newVersion };
      } catch (err) {
        console.error("Error refreshing analytics:", err);
        return { success: false, error: err };
      }
    },
    [invalidateSiteQueries]
  );

  /**
   * Show refresh status toast and trigger refresh
   */
  const refreshWithNotification = useCallback(
    async (siteId: string, importedCount: number) => {
      // Show "updating" toast
      const { dismiss } = toast({
        title: "Mise à jour des analytics...",
        description: `${importedCount} opérations importées. Recalcul en cours.`,
      });

      try {
        const result = await refreshAnalytics(siteId, "success");

        dismiss();

        if (result.success) {
          toast({
            title: "Analytics mis à jour",
            description: "Toutes les pages reflètent maintenant les nouvelles données.",
          });
        }

        return result;
      } catch (err) {
        dismiss();
        toast({
          title: "Erreur",
          description: "La mise à jour des analytics a échoué.",
          variant: "destructive",
        });
        return { success: false, error: err };
      }
    },
    [refreshAnalytics]
  );

  return {
    refreshAnalytics,
    invalidateSiteQueries,
    refreshWithNotification,
  };
}
