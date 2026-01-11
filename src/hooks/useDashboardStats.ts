import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DateRange } from "react-day-picker";
import { 
  startOfMonth, 
  subMonths, 
  format, 
  parseISO, 
  getDay,
  eachDayOfInterval,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { filterRevenueOperations, isCBPayment, isESPPayment } from "@/lib/operationFilters";

export interface DashboardStats {
  // Revenue KPIs
  totalRevenue: number;
  revenueByCard: number;
  revenueByCash: number;
  totalTransactions: number;
  averageBasket: number;
  
  // Trends (compared to previous period)
  revenueTrend: number;
  transactionsTrend: number;
  
  // Charts data
  monthlyData: { month: string; revenue: number }[];
  dailyData: { date: string; revenue: number }[];
  paymentData: { name: string; value: number; color: string }[];
  weekdayData: { day: string; revenue: number; transactions: number }[];
  heatmapData: { day: string; hour: number; cycles: number }[];
  
  // Machine data
  machinePerformance: { 
    id: string; 
    name: string; 
    type: "washer" | "dryer"; 
    revenue: number; 
    cycles: number; 
    occupancyRate: number 
  }[];
  
  // Analytics source
  dataSource: "analytics" | "operations";
}

interface AnalyticsDaily {
  date: string;
  revenue: number;
  transactions: number;
  revenue_card: number;
  revenue_cash: number;
  machine_stats: { unique_count?: number; machines?: string[] } | null;
  hourly_breakdown: { hour: number; revenue: number; transactions: number }[] | null;
}

interface AnalyticsKPI {
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

const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export function useDashboardStats(dateRange?: DateRange, siteId?: string) {
  const { user } = useAuth();
  const [analyticsDaily, setAnalyticsDaily] = useState<AnalyticsDaily[]>([]);
  const [analyticsKpis, setAnalyticsKpis] = useState<AnalyticsKPI[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"analytics" | "operations">("analytics");

  const fetchData = useCallback(async () => {
    if (!user) {
      setOperations([]);
      setAnalyticsDaily([]);
      setAnalyticsKpis([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startStr = dateRange?.from 
        ? format(dateRange.from, "yyyy-MM-dd") 
        : format(subMonths(new Date(), 12), "yyyy-MM-dd");
      const endStr = dateRange?.to 
        ? format(dateRange.to, "yyyy-MM-dd") 
        : format(new Date(), "yyyy-MM-dd");

      // Try to fetch pre-calculated analytics first
      if (siteId) {
        const [dailyRes, kpiRes] = await Promise.all([
          supabase
            .from("analytics_daily")
            .select("*")
            .eq("site_id", siteId)
            .gte("date", startStr)
            .lte("date", endStr)
            .order("date", { ascending: true }),
          supabase
            .from("analytics_kpis")
            .select("*")
            .eq("site_id", siteId)
            .eq("period_type", "monthly")
            .order("period_start", { ascending: true }),
        ]);

        if (!dailyRes.error && dailyRes.data && dailyRes.data.length > 0) {
          // Use pre-calculated analytics
          setAnalyticsDaily(dailyRes.data.map((d: any) => ({
            date: d.date,
            revenue: Number(d.revenue),
            transactions: d.transactions,
            revenue_card: Number(d.revenue_card),
            revenue_cash: Number(d.revenue_cash),
            machine_stats: d.machine_stats as AnalyticsDaily["machine_stats"],
            hourly_breakdown: d.hourly_breakdown as AnalyticsDaily["hourly_breakdown"],
          })));
          
          if (!kpiRes.error && kpiRes.data) {
            setAnalyticsKpis(kpiRes.data as unknown as AnalyticsKPI[]);
          }
          
          setDataSource("analytics");
          setOperations([]);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to operations if no analytics data
      let query = supabase
        .from("operations")
        .select("*")
        .eq("user_id", user.id)
        .order("operation_date", { ascending: false });

      if (siteId) {
        query = query.eq("site_id", siteId);
      }

      const oneYearAgo = startOfMonth(subMonths(new Date(), 11));
      query = query.gte("operation_date", format(oneYearAgo, "yyyy-MM-dd"));

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setOperations(data || []);
      setAnalyticsDaily([]);
      setAnalyticsKpis([]);
      setDataSource("operations");
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Impossible de charger les données");
    } finally {
      setIsLoading(false);
    }
  }, [user, siteId, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate stats from analytics or operations
  const stats = useMemo((): DashboardStats => {
    // Use pre-calculated analytics if available
    if (dataSource === "analytics" && analyticsDaily.length > 0) {
      return computeStatsFromAnalytics(analyticsDaily, analyticsKpis, dateRange);
    }

    // Fallback to computing from raw operations
    return computeStatsFromOperations(operations, dateRange);
  }, [analyticsDaily, analyticsKpis, operations, dateRange, dataSource]);

  return {
    stats,
    isLoading,
    error,
    isEmpty: !isLoading && analyticsDaily.length === 0 && operations.length === 0,
    refetch: fetchData,
    dataSource,
  };
}

function computeStatsFromAnalytics(
  dailyData: AnalyticsDaily[],
  kpis: AnalyticsKPI[],
  dateRange?: DateRange
): DashboardStats {
  // Filter by date range
  const filtered = dailyData.filter(d => {
    if (!dateRange?.from || !dateRange?.to) return true;
    const dDate = parseISO(d.date);
    return isWithinInterval(startOfDay(dDate), {
      start: startOfDay(dateRange.from),
      end: startOfDay(dateRange.to),
    });
  });

  // Aggregate totals
  const totalRevenue = filtered.reduce((sum, d) => sum + d.revenue, 0);
  const revenueByCard = filtered.reduce((sum, d) => sum + d.revenue_card, 0);
  const revenueByCash = filtered.reduce((sum, d) => sum + d.revenue_cash, 0);
  const totalTransactions = filtered.reduce((sum, d) => sum + d.transactions, 0);
  const averageBasket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Calculate trends (first half vs second half)
  const midpoint = Math.floor(filtered.length / 2);
  const firstHalf = filtered.slice(0, midpoint);
  const secondHalf = filtered.slice(midpoint);

  const firstRevenue = firstHalf.reduce((sum, d) => sum + d.revenue, 0);
  const secondRevenue = secondHalf.reduce((sum, d) => sum + d.revenue, 0);
  const firstTx = firstHalf.reduce((sum, d) => sum + d.transactions, 0);
  const secondTx = secondHalf.reduce((sum, d) => sum + d.transactions, 0);

  const revenueTrend = firstRevenue > 0 ? ((secondRevenue - firstRevenue) / firstRevenue) * 100 : 0;
  const transactionsTrend = firstTx > 0 ? ((secondTx - firstTx) / firstTx) * 100 : 0;

  // Monthly data from KPIs or aggregate from daily
  const monthlyData = MONTHS.map((month, index) => {
    const monthlyKpi = kpis.find(k => {
      const start = parseISO(k.period_start);
      return start.getMonth() === index;
    });
    if (monthlyKpi) {
      return { month, revenue: Number(monthlyKpi.total_revenue) };
    }
    // Fallback: aggregate from daily
    const monthDays = filtered.filter(d => parseISO(d.date).getMonth() === index);
    return { month, revenue: monthDays.reduce((sum, d) => sum + d.revenue, 0) };
  });

  // Daily chart data (last 7 days of period)
  const chartDaily = filtered.slice(-7).map(d => ({
    date: format(parseISO(d.date), "dd/MM"),
    revenue: d.revenue,
  }));

  // Payment distribution
  const loyaltyRevenue = Math.max(0, totalRevenue - revenueByCard - revenueByCash);
  const paymentData = [
    { name: "Carte bancaire", value: Math.round(revenueByCard), color: "#BED7F0" },
    { name: "Espèces", value: Math.round(revenueByCash), color: "hsl(72, 80%, 43%)" },
    { name: "Fidélité", value: Math.round(loyaltyRevenue), color: "#D9D9D9" },
  ];

  // Weekday performance
  const weekdayStats: Record<string, { revenue: number; transactions: number }> = {};
  WEEKDAYS.forEach(day => { weekdayStats[day] = { revenue: 0, transactions: 0 }; });
  
  filtered.forEach(d => {
    const dayIndex = getDay(parseISO(d.date));
    const dayName = WEEKDAYS[dayIndex];
    weekdayStats[dayName].revenue += d.revenue;
    weekdayStats[dayName].transactions += d.transactions;
  });

  const weekdayData = WEEKDAYS.slice(1).concat(WEEKDAYS[0]).map(day => ({
    day,
    revenue: weekdayStats[day].revenue,
    transactions: weekdayStats[day].transactions,
  }));

  // Heatmap from hourly_breakdown
  const heatmapData: { day: string; hour: number; cycles: number }[] = [];
  const daysOrder = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const hourlyAgg: Record<string, Record<number, number>> = {};
  
  daysOrder.forEach(day => { hourlyAgg[day] = {}; });
  
  filtered.forEach(d => {
    const dayIndex = getDay(parseISO(d.date));
    const dayName = daysOrder[(dayIndex + 6) % 7]; // Convert to Mon-Sun
    if (d.hourly_breakdown) {
      d.hourly_breakdown.forEach(h => {
        hourlyAgg[dayName][h.hour] = (hourlyAgg[dayName][h.hour] || 0) + h.transactions;
      });
    }
  });

  daysOrder.forEach(day => {
    for (let hour = 7; hour <= 21; hour++) {
      heatmapData.push({ day, hour, cycles: hourlyAgg[day][hour] || 0 });
    }
  });

  // Machine performance from machine_stats
  const machineRevenue: Record<string, { revenue: number; cycles: number }> = {};
  filtered.forEach(d => {
    if (d.machine_stats?.machines) {
      const perMachineRevenue = d.revenue / (d.machine_stats.machines.length || 1);
      const perMachineCycles = d.transactions / (d.machine_stats.machines.length || 1);
      d.machine_stats.machines.forEach(m => {
        if (!machineRevenue[m]) {
          machineRevenue[m] = { revenue: 0, cycles: 0 };
        }
        machineRevenue[m].revenue += perMachineRevenue;
        machineRevenue[m].cycles += perMachineCycles;
      });
    }
  });

  const periodLength = filtered.length || 30;
  const machinePerformance = Object.entries(machineRevenue)
    .map(([name, stats]) => {
      const isWasher = name.toLowerCase().includes("lave") || name.toLowerCase().includes("laveuse");
      return {
        id: name.replace(/\s+/g, "_").toUpperCase(),
        name,
        type: isWasher ? "washer" as const : "dryer" as const,
        revenue: Math.round(stats.revenue),
        cycles: Math.round(stats.cycles),
        occupancyRate: Math.min(Math.round((stats.cycles / (periodLength * 12)) * 100), 100),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    totalRevenue,
    revenueByCard,
    revenueByCash,
    totalTransactions,
    averageBasket,
    revenueTrend,
    transactionsTrend,
    monthlyData,
    dailyData: chartDaily,
    paymentData,
    weekdayData,
    heatmapData,
    machinePerformance,
    dataSource: "analytics",
  };
}

function computeStatsFromOperations(operations: any[], dateRange?: DateRange): DashboardStats {
  // Filter operations by date range
  const dateFilteredOps = operations.filter(op => {
    if (!dateRange?.from || !dateRange?.to) return true;
    const opDate = parseISO(op.operation_date);
    return isWithinInterval(startOfDay(opDate), {
      start: startOfDay(dateRange.from),
      end: startOfDay(dateRange.to),
    });
  });

  // Exclude rechargements from revenue calculations
  const filteredOps = filterRevenueOperations(dateFilteredOps);

  // Calculate previous period for trends
  const periodLength = dateRange?.from && dateRange?.to 
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    : 30;
  
  const previousFrom = dateRange?.from ? new Date(dateRange.from.getTime() - periodLength * 24 * 60 * 60 * 1000) : undefined;
  const previousTo = dateRange?.from ? new Date(dateRange.from.getTime() - 1) : undefined;
  
  const previousDateFilteredOps = operations.filter(op => {
    if (!previousFrom || !previousTo) return false;
    const opDate = parseISO(op.operation_date);
    return isWithinInterval(startOfDay(opDate), {
      start: startOfDay(previousFrom),
      end: startOfDay(previousTo),
    });
  });
  
  // Also exclude rechargements from previous period
  const previousOps = filterRevenueOperations(previousDateFilteredOps);

  // Revenue calculations
  const totalRevenue = filteredOps.reduce((sum, op) => sum + Number(op.amount), 0);
  const revenueByCard = filteredOps
    .filter(isCBPayment)
    .reduce((sum, op) => sum + Number(op.amount), 0);
  const revenueByCash = filteredOps
    .filter(isESPPayment)
    .reduce((sum, op) => sum + Number(op.amount), 0);
  const totalTransactions = filteredOps.length;
  const averageBasket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Trends
  const previousRevenue = previousOps.reduce((sum, op) => sum + Number(op.amount), 0);
  const previousTransactions = previousOps.length;
  const revenueTrend = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
    : 0;
  const transactionsTrend = previousTransactions > 0 
    ? ((totalTransactions - previousTransactions) / previousTransactions) * 100 
    : 0;

  // Monthly data - also filter rechargements
  const monthlyData = MONTHS.map((month, index) => {
    const monthOps = filterRevenueOperations(operations.filter(op => {
      const opDate = parseISO(op.operation_date);
      return opDate.getMonth() === index;
    }));
    return {
      month,
      revenue: monthOps.reduce((sum, op) => sum + Number(op.amount), 0),
    };
  });

  // Daily data
  const dailyData: { date: string; revenue: number }[] = [];
  if (dateRange?.from && dateRange?.to) {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    days.slice(-7).forEach(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayOps = filteredOps.filter(op => op.operation_date === dayStr);
      dailyData.push({
        date: format(day, "dd/MM"),
        revenue: dayOps.reduce((sum, op) => sum + Number(op.amount), 0),
      });
    });
  }

  // Payment distribution
  const loyaltyRevenue = totalRevenue - revenueByCard - revenueByCash;
  const paymentData = [
    { name: "Carte bancaire", value: Math.round(revenueByCard), color: "#BED7F0" },
    { name: "Espèces", value: Math.round(revenueByCash), color: "hsl(72, 80%, 43%)" },
    { name: "Fidélité", value: Math.round(loyaltyRevenue > 0 ? loyaltyRevenue : 0), color: "#D9D9D9" },
  ];

  // Weekday performance
  const weekdayData = WEEKDAYS.slice(1).concat(WEEKDAYS[0]).map(day => {
    const dayIndex = WEEKDAYS.indexOf(day);
    const dayOps = filteredOps.filter(op => {
      const opDate = parseISO(op.operation_date);
      return getDay(opDate) === dayIndex;
    });
    return {
      day,
      revenue: dayOps.reduce((sum, op) => sum + Number(op.amount), 0),
      transactions: dayOps.length,
    };
  });

  // Heatmap data
  const heatmapData: { day: string; hour: number; cycles: number }[] = [];
  const daysOrder = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  daysOrder.forEach(day => {
    for (let hour = 7; hour <= 21; hour++) {
      const dayIndex = daysOrder.indexOf(day);
      const realDayIndex = (dayIndex + 1) % 7;
      const count = filteredOps.filter(op => {
        const opDate = parseISO(op.operation_date);
        if (getDay(opDate) !== realDayIndex) return false;
        if (!op.operation_time) return false;
        const opHour = parseInt(op.operation_time.split(":")[0], 10);
        return opHour === hour;
      }).length;
      heatmapData.push({ day, hour, cycles: count });
    }
  });

  // Machine performance
  const machineStats: Record<string, { revenue: number; cycles: number }> = {};
  filteredOps.forEach(op => {
    if (op.machine) {
      if (!machineStats[op.machine]) {
        machineStats[op.machine] = { revenue: 0, cycles: 0 };
      }
      machineStats[op.machine].revenue += Number(op.amount);
      machineStats[op.machine].cycles += 1;
    }
  });

  const machinePerformance = Object.entries(machineStats)
    .map(([name, stats]) => {
      const isWasher = name.toLowerCase().includes("lave") || name.toLowerCase().includes("laveuse");
      return {
        id: name.replace(/\s+/g, "_").toUpperCase(),
        name,
        type: isWasher ? "washer" as const : "dryer" as const,
        revenue: Math.round(stats.revenue),
        cycles: stats.cycles,
        occupancyRate: Math.min(Math.round((stats.cycles / (periodLength * 12)) * 100), 100),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    totalRevenue,
    revenueByCard,
    revenueByCash,
    totalTransactions,
    averageBasket,
    revenueTrend,
    transactionsTrend,
    monthlyData,
    dailyData,
    paymentData,
    weekdayData,
    heatmapData,
    machinePerformance,
    dataSource: "operations",
  };
}
