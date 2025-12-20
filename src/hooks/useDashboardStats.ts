import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DateRange } from "react-day-picker";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfYear,
  subMonths, 
  format, 
  parseISO, 
  getDay,
  getHours,
  eachDayOfInterval,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";

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
}

const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export function useDashboardStats(dateRange?: DateRange, siteId?: string) {
  const { user } = useAuth();
  const [operations, setOperations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOperations([]);
      setIsLoading(false);
      return;
    }

    fetchOperations();
  }, [user, siteId]);

  const fetchOperations = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("operations")
        .select("*")
        .eq("user_id", user.id)
        .order("operation_date", { ascending: false });

      if (siteId) {
        query = query.eq("site_id", siteId);
      }

      // Fetch last 12 months of data
      const oneYearAgo = startOfMonth(subMonths(new Date(), 11));
      query = query.gte("operation_date", format(oneYearAgo, "yyyy-MM-dd"));

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setOperations(data || []);
    } catch (err) {
      console.error("Error fetching dashboard operations:", err);
      setError("Impossible de charger les données");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats from operations
  const stats = useMemo((): DashboardStats => {
    // Filter operations by date range
    const filteredOps = operations.filter(op => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const opDate = parseISO(op.operation_date);
      return isWithinInterval(startOfDay(opDate), {
        start: startOfDay(dateRange.from),
        end: startOfDay(dateRange.to),
      });
    });

    // Calculate previous period for trends
    const periodLength = dateRange?.from && dateRange?.to 
      ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      : 30;
    
    const previousFrom = dateRange?.from ? new Date(dateRange.from.getTime() - periodLength * 24 * 60 * 60 * 1000) : undefined;
    const previousTo = dateRange?.from ? new Date(dateRange.from.getTime() - 1) : undefined;
    
    const previousOps = operations.filter(op => {
      if (!previousFrom || !previousTo) return false;
      const opDate = parseISO(op.operation_date);
      return isWithinInterval(startOfDay(opDate), {
        start: startOfDay(previousFrom),
        end: startOfDay(previousTo),
      });
    });

    // Revenue calculations
    const totalRevenue = filteredOps.reduce((sum, op) => sum + Number(op.amount), 0);
    const revenueByCard = filteredOps
      .filter(op => op.payment_mode?.toUpperCase() === "CB")
      .reduce((sum, op) => sum + Number(op.amount), 0);
    const revenueByCash = filteredOps
      .filter(op => op.payment_mode?.toUpperCase() === "ESP")
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

    // Monthly data (last 12 months)
    const monthlyData = MONTHS.map((month, index) => {
      const monthOps = operations.filter(op => {
        const opDate = parseISO(op.operation_date);
        return opDate.getMonth() === index;
      });
      return {
        month,
        revenue: monthOps.reduce((sum, op) => sum + Number(op.amount), 0),
      };
    });

    // Daily data (for selected period)
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
        const realDayIndex = (dayIndex + 1) % 7; // Convert to JS day index
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
          occupancyRate: Math.min(Math.round((stats.cycles / (periodLength * 12)) * 100), 100), // Estimate
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
    };
  }, [operations, dateRange]);

  return {
    stats,
    isLoading,
    error,
    isEmpty: !isLoading && operations.length === 0,
    refetch: fetchOperations,
  };
}
