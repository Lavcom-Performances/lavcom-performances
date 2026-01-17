import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSite } from "./useCurrentSite";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface BenchmarkData {
  median_daily_revenue: number;
  avg_cb_share: number;
  avg_esp_share: number;
  top_hours: number[];
}

interface MyValues {
  avg_daily_revenue: number;
  cb_share: number;
  esp_share: number;
  top_hours: number[];
}

interface BenchmarksResult {
  available: boolean;
  reason?: string;
  scope_type?: 'department' | 'region' | 'national';
  scope_code?: string;
  n_sites?: number;
  threshold?: number;
  benchmark?: BenchmarkData;
  my_values?: MyValues;
}

export function useAnonymousBenchmarks(dateRange: DateRange | undefined) {
  const { currentSiteId, isDemo } = useCurrentSite();
  
  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;

  return useQuery({
    queryKey: ["benchmarks", currentSiteId, startDate, endDate],
    queryFn: async (): Promise<BenchmarksResult> => {
      if (!currentSiteId || !startDate || !endDate) {
        return { available: false, reason: 'missing_params' };
      }
      
      // Skip for demo sites
      if (isDemo) {
        return { available: false, reason: 'demo_site' };
      }

      const { data, error } = await supabase.rpc("rpc_get_benchmarks" as any, {
        p_site_id: currentSiteId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        console.error("[Benchmarks] RPC error:", error);
        // Log to system_events
        await supabase.rpc("rpc_log_system_event", {
          p_source: "benchmarks",
          p_severity: "error",
          p_message: "Failed to fetch benchmarks",
          p_code: "BENCHMARKS_RPC_ERROR",
          p_env: import.meta.env.MODE,
          p_meta: { site_id: currentSiteId, error: error.message },
        });
        return { available: false, reason: 'rpc_error' };
      }

      // Log if insufficient sample
      if (data && !data.available && data.reason === 'insufficient_sample') {
        await supabase.rpc("rpc_log_system_event", {
          p_source: "benchmarks",
          p_severity: "info",
          p_message: `Benchmarks unavailable: insufficient sample (${data.n_sites}/${data.threshold})`,
          p_code: "BENCHMARKS_INSUFFICIENT_SAMPLE",
          p_env: import.meta.env.MODE,
          p_meta: { site_id: currentSiteId, n_sites: data.n_sites, threshold: data.threshold },
        });
      }

      return data as BenchmarksResult;
    },
    enabled: !!currentSiteId && !!startDate && !!endDate && !isDemo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export type { BenchmarksResult, BenchmarkData, MyValues };
