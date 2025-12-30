import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface AnalyticsKPI {
  id: string;
  site_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_transactions: number;
  revenue_card: number;
  revenue_cash: number;
  average_basket: number;
  unique_machines: number;
  peak_hour: number | null;
}

interface MachineStats {
  unique_count?: number;
  machines?: string[];
}

interface HourlyEntry {
  hour: number;
  revenue: number;
  transactions: number;
}

interface AnalyticsDaily {
  id: string;
  site_id: string;
  date: string;
  revenue: number;
  transactions: number;
  revenue_card: number;
  revenue_cash: number;
  average_basket: number;
  machine_stats: MachineStats | null;
  hourly_breakdown: HourlyEntry[] | null;
}

interface AggregatedStats {
  totalRevenue: number;
  totalTransactions: number;
  revenueCard: number;
  revenueCash: number;
  averageBasket: number;
  uniqueMachines: number;
  peakHour: number | null;
  revenueTrend: number;
  transactionsTrend: number;
}

interface UseAnalyticsResult {
  kpis: AnalyticsKPI[];
  dailyData: AnalyticsDaily[];
  aggregatedStats: AggregatedStats | null;
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
  refetch: () => Promise<void>;
  computeAnalytics: (startDate?: string, endDate?: string) => Promise<void>;
  isComputing: boolean;
}

export function useAnalytics(
  siteId?: string,
  dateRange?: DateRange
): UseAnalyticsResult {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<AnalyticsKPI[]>([]);
  const [dailyData, setDailyData] = useState<AnalyticsDaily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!user || !siteId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Determine date range
      const endDate = dateRange?.to || new Date();
      const startDate = dateRange?.from || subMonths(endDate, 12);
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      // Fetch KPIs
      const { data: kpiData, error: kpiError } = await supabase
        .from("analytics_kpis")
        .select("*")
        .eq("site_id", siteId)
        .gte("period_start", startStr)
        .lte("period_end", endStr)
        .order("period_start", { ascending: false });

      if (kpiError) throw kpiError;

      // Fetch daily data
      const { data: daily, error: dailyError } = await supabase
        .from("analytics_daily")
        .select("*")
        .eq("site_id", siteId)
        .gte("date", startStr)
        .lte("date", endStr)
        .order("date", { ascending: true });

      if (dailyError) throw dailyError;

      setKpis((kpiData || []) as unknown as AnalyticsKPI[]);
      setDailyData((daily || []).map((d: any) => ({
        ...d,
        machine_stats: d.machine_stats as MachineStats | null,
        hourly_breakdown: d.hourly_breakdown as HourlyEntry[] | null,
      })));
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, siteId, dateRange]);

  const computeAnalytics = useCallback(
    async (startDate?: string, endDate?: string) => {
      if (!user || !siteId) return;

      setIsComputing(true);
      setError(null);

      try {
        const { data, error } = await supabase.functions.invoke("compute-analytics", {
          body: {
            site_id: siteId,
            user_id: user.id,
            start_date: startDate,
            end_date: endDate,
          },
        });

        if (error) throw error;

        console.log("Analytics computed:", data);
        
        // Refetch after computation
        await fetchAnalytics();
      } catch (err: any) {
        console.error("Error computing analytics:", err);
        setError(err.message);
      } finally {
        setIsComputing(false);
      }
    },
    [user, siteId, fetchAnalytics]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const aggregatedStats = useMemo((): AggregatedStats | null => {
    if (dailyData.length === 0) return null;

    const totalRevenue = dailyData.reduce((sum, d) => sum + Number(d.revenue), 0);
    const totalTransactions = dailyData.reduce((sum, d) => sum + d.transactions, 0);
    const revenueCard = dailyData.reduce((sum, d) => sum + Number(d.revenue_card), 0);
    const revenueCash = dailyData.reduce((sum, d) => sum + Number(d.revenue_cash), 0);
    const averageBasket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Unique machines across all days
    const allMachines = new Set<string>();
    dailyData.forEach((d) => {
      if (d.machine_stats?.machines) {
        d.machine_stats.machines.forEach((m) => allMachines.add(m));
      }
    });

    // Peak hour calculation
    const hourlyTotals: Record<number, number> = {};
    dailyData.forEach((d) => {
      if (d.hourly_breakdown) {
        d.hourly_breakdown.forEach((h) => {
          hourlyTotals[h.hour] = (hourlyTotals[h.hour] || 0) + h.transactions;
        });
      }
    });
    
    let peakHour: number | null = null;
    let maxTx = 0;
    Object.entries(hourlyTotals).forEach(([hour, tx]) => {
      if (tx > maxTx) {
        maxTx = tx;
        peakHour = parseInt(hour, 10);
      }
    });

    // Calculate trends (compare first half vs second half of period)
    const midpoint = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, midpoint);
    const secondHalf = dailyData.slice(midpoint);

    const firstHalfRevenue = firstHalf.reduce((sum, d) => sum + Number(d.revenue), 0);
    const secondHalfRevenue = secondHalf.reduce((sum, d) => sum + Number(d.revenue), 0);
    const firstHalfTx = firstHalf.reduce((sum, d) => sum + d.transactions, 0);
    const secondHalfTx = secondHalf.reduce((sum, d) => sum + d.transactions, 0);

    const revenueTrend = firstHalfRevenue > 0 
      ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 
      : 0;
    const transactionsTrend = firstHalfTx > 0 
      ? ((secondHalfTx - firstHalfTx) / firstHalfTx) * 100 
      : 0;

    return {
      totalRevenue,
      totalTransactions,
      revenueCard,
      revenueCash,
      averageBasket,
      uniqueMachines: allMachines.size,
      peakHour,
      revenueTrend,
      transactionsTrend,
    };
  }, [dailyData]);

  return {
    kpis,
    dailyData,
    aggregatedStats,
    isLoading,
    error,
    isEmpty: !isLoading && kpis.length === 0 && dailyData.length === 0,
    refetch: fetchAnalytics,
    computeAnalytics,
    isComputing,
  };
}
