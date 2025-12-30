import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChartFilters, defaultChartFilters, heatmapDefaultFilters, machinePageDefaultFilters } from "@/components/charts/ChartPageFilters";

type FiltersWithoutDate = Omit<ChartFilters, 'dateRange'>;

// Page-specific defaults
const PAGE_DEFAULTS: Record<string, FiltersWithoutDate> = {
  heatmap: heatmapDefaultFilters,
  machine_type: machinePageDefaultFilters,
  // All other pages use defaultChartFilters
};

export function useChartPreferences(pageKey: string) {
  const { user } = useAuth();
  const [filters, setFiltersState] = useState<FiltersWithoutDate>(() => 
    PAGE_DEFAULTS[pageKey] || defaultChartFilters
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    if (!user?.id) {
      setIsLoaded(true);
      return;
    }

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from("user_chart_preferences")
          .select("filters")
          .eq("user_id", user.id)
          .eq("page_key", pageKey)
          .maybeSingle();

        if (error) {
          console.error("Error loading chart preferences:", error);
          setIsLoaded(true);
          return;
        }

        if (data?.filters) {
          // Merge saved filters with defaults (in case new filter options were added)
          const savedFilters = data.filters as FiltersWithoutDate;
          setFiltersState({
            paymentModes: savedFilters.paymentModes ?? (PAGE_DEFAULTS[pageKey]?.paymentModes || []),
            machineTypes: savedFilters.machineTypes ?? (PAGE_DEFAULTS[pageKey]?.machineTypes || []),
            machines: savedFilters.machines ?? (PAGE_DEFAULTS[pageKey]?.machines || []),
            daysOfWeek: savedFilters.daysOfWeek ?? (PAGE_DEFAULTS[pageKey]?.daysOfWeek || []),
          });
        }
      } catch (err) {
        console.error("Error loading chart preferences:", err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadPreferences();
  }, [user?.id, pageKey]);

  // Save preferences when they change
  const setFilters = useCallback(async (newFilters: FiltersWithoutDate) => {
    setFiltersState(newFilters);

    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("user_chart_preferences")
        .upsert(
          {
            user_id: user.id,
            page_key: pageKey,
            filters: newFilters,
          },
          {
            onConflict: "user_id,page_key",
          }
        );

      if (error) {
        console.error("Error saving chart preferences:", error);
      }
    } catch (err) {
      console.error("Error saving chart preferences:", err);
    }
  }, [user?.id, pageKey]);

  return {
    filters,
    setFilters,
    isLoaded,
  };
}
