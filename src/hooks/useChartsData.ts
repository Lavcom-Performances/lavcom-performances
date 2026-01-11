// Hook for fetching chart data from operations table with date range filtering
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { useDateRange } from "@/hooks/useDateRange";
import { getDay, format } from "date-fns";
import { ChartFilters } from "@/components/charts/ChartPageFilters";
import { isRechargement, isCBPayment, isESPPayment, isFIPayment } from "@/lib/operationFilters";

// Helper to filter operations by multi-select filters
function applyFilters<T extends { 
  operation_date?: string;
  payment_mode?: string | null;
  machine_name?: string | null;
  machine?: string | null;
  type?: string | null;
}>(data: T[], filters?: Omit<ChartFilters, 'dateRange'>, excludeRechargements: boolean = true): T[] {
  let filtered = data;
  
  // Always exclude rechargements from revenue calculations unless explicitly included
  if (excludeRechargements) {
    filtered = filtered.filter(op => !isRechargement(op));
  }
  
  if (!filters) return filtered;
  
  return filtered.filter(op => {
    // Payment mode filter (multi-select)
    if (filters.paymentModes.length > 0) {
      const mode = op.payment_mode?.toUpperCase();
      if (!mode || !filters.paymentModes.includes(mode)) return false;
    }
    
    // Machine type filter (multi-select)
    if (filters.machineTypes.length > 0) {
      const machineName = (op.machine_name || op.machine || "").toLowerCase();
      const type = op.type?.toLowerCase() || "";
      
      const isWashing = machineName.includes("lave") || type.includes("lave") || type === "ll";
      const isDrying = machineName.includes("sèche") || machineName.includes("seche") || 
                       type.includes("sèche") || type.includes("seche") || type === "sl";
      const isLessive = machineName.includes("lessive") || type.includes("lessive");
      const isRecharge = machineName.includes("rech") || type.includes("rech");
      
      let matches = false;
      if (filters.machineTypes.includes("LL") && isWashing) matches = true;
      if (filters.machineTypes.includes("SL") && isDrying) matches = true;
      if (filters.machineTypes.includes("LESSIVE") && isLessive) matches = true;
      if (filters.machineTypes.includes("RECH") && isRecharge) matches = true;
      
      if (!matches) return false;
    }
    
    // Specific machine filter (multi-select)
    if (filters.machines.length > 0) {
      const machineName = op.machine_name || op.machine;
      if (!machineName || !filters.machines.includes(machineName)) return false;
    }
    
    // Day of week filter (multi-select)
    if (filters.daysOfWeek.length > 0 && op.operation_date) {
      const dayOfWeek = getDay(new Date(op.operation_date));
      if (!filters.daysOfWeek.includes(dayOfWeek.toString())) return false;
    }
    
    return true;
  });
}

// Daily revenue data
export function useDailyRevenue(filters?: Omit<ChartFilters, 'dateRange'>) {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["dailyRevenue", currentSiteId, formattedRange.from, formattedRange.to, filters],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_date, amount, payment_mode, machine_name, machine, type")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to)
        .order("operation_date", { ascending: true });

      if (error) throw error;

      // Apply filters (rechargements excluded by default)
      const filtered = applyFilters(data || [], filters);

      // Group by date - use amount + payment_mode for accurate calculation
      const grouped = new Map<string, { cb: number; esp: number; fi: number }>();
      filtered.forEach((op) => {
        const date = op.operation_date;
        const existing = grouped.get(date) || { cb: 0, esp: 0, fi: 0 };
        const amount = Number(op.amount || 0);
        
        if (isCBPayment(op)) {
          existing.cb += amount;
        } else if (isESPPayment(op)) {
          existing.esp += amount;
        } else if (isFIPayment(op)) {
          existing.fi += amount;
        }
        grouped.set(date, existing);
      });

      return Array.from(grouped.entries()).map(([date, values]) => ({
        date: format(new Date(date), "dd/MM"),
        fullDate: date,
        revenue: values.cb + values.esp + values.fi,
        cb: values.cb,
        esp: values.esp,
      }));
    },
    enabled: !!currentSiteId && !!formattedRange.from && !!formattedRange.to,
  });
}

// Payment distribution data
export function usePaymentDistribution(filters?: Omit<ChartFilters, 'dateRange'>) {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["paymentDistribution", currentSiteId, formattedRange.from, formattedRange.to, filters],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("amount, payment_mode, machine_name, machine, type, operation_date")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to);

      if (error) throw error;

      // Apply filters (excluding payment mode filter for this chart)
      const filtersWithoutPayment = filters ? { ...filters, paymentModes: [] } : undefined;
      const filtered = applyFilters(data || [], filtersWithoutPayment);

      let totalCb = 0;
      let totalEsp = 0;
      let totalFi = 0;

      filtered.forEach((op) => {
        const amount = Number(op.amount || 0);
        if (isCBPayment(op)) {
          totalCb += amount;
        } else if (isESPPayment(op)) {
          totalEsp += amount;
        } else if (isFIPayment(op)) {
          totalFi += amount;
        }
      });

      return [
        { name: "Carte bancaire", value: totalCb, color: "#BED7F0" },
        { name: "Espèces", value: totalEsp, color: "hsl(72, 80%, 43%)" },
        ...(totalFi > 0 ? [{ name: "Fidélité", value: totalFi, color: "#D9D9D9" }] : []),
      ].filter(item => item.value > 0);
    },
    enabled: !!currentSiteId && !!formattedRange.from && !!formattedRange.to,
  });
}

// Hourly frequency data
export function useHourlyFrequency(filters?: Omit<ChartFilters, 'dateRange'>) {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["hourlyFrequency", currentSiteId, formattedRange.from, formattedRange.to, filters],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_date, operation_time, payment_mode, machine_name, machine, type")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to)
        .not("operation_time", "is", null);

      if (error) throw error;

      // Apply filters
      const filtered = applyFilters(data || [], filters);

      const hours: Record<number, number> = {};
      for (let i = 6; i <= 22; i++) hours[i] = 0;

      filtered.forEach((op) => {
        if (op.operation_time) {
          const hour = parseInt(op.operation_time.split(":")[0], 10);
          if (hour >= 6 && hour <= 22) {
            hours[hour] = (hours[hour] || 0) + 1;
          }
        }
      });

      return Object.entries(hours).map(([hour, count]) => ({
        hour: `${hour.padStart(2, "0")}h`,
        count,
      }));
    },
    enabled: !!currentSiteId && !!formattedRange.from && !!formattedRange.to,
  });
}

// Daily frequency (by day of week)
export function useDailyFrequency(filters?: Omit<ChartFilters, 'dateRange'>) {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["dailyFrequency", currentSiteId, formattedRange.from, formattedRange.to, filters],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_date, payment_mode, machine_name, machine, type")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to);

      if (error) throw error;

      // Apply filters (excluding day filter for this chart)
      const filtersWithoutDay = filters ? { ...filters, daysOfWeek: [] } : undefined;
      const filtered = applyFilters(data || [], filtersWithoutDay);

      const days: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

      filtered.forEach((op) => {
        const dayOfWeek = getDay(new Date(op.operation_date));
        days[dayOfWeek] = (days[dayOfWeek] || 0) + 1;
      });

      // Reorder to start from Monday
      return [1, 2, 3, 4, 5, 6, 0].map((day) => ({
        day: dayNames[day],
        count: days[day],
      }));
    },
    enabled: !!currentSiteId && !!formattedRange.from && !!formattedRange.to,
  });
}

// Half-hourly frequency
export function useHalfHourlyFrequency(filters?: Omit<ChartFilters, 'dateRange'>) {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["halfHourlyFrequency", currentSiteId, formattedRange.from, formattedRange.to, filters],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_time, operation_date, payment_mode, machine_name, machine, type")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to)
        .not("operation_time", "is", null);

      if (error) throw error;

      // Apply filters
      const filtered = applyFilters(data || [], filters);

      const slots: Record<string, number> = {};
      for (let h = 7; h <= 21; h++) {
        slots[`${h.toString().padStart(2, "0")}:00`] = 0;
        slots[`${h.toString().padStart(2, "0")}:30`] = 0;
      }

      filtered.forEach((op) => {
        if (op.operation_time) {
          const [hourStr, minStr] = op.operation_time.split(":");
          const hour = parseInt(hourStr, 10);
          const min = parseInt(minStr, 10);
          if (hour >= 7 && hour <= 21) {
            const slot = `${hourStr}:${min < 30 ? "00" : "30"}`;
            slots[slot] = (slots[slot] || 0) + 1;
          }
        }
      });

      return Object.entries(slots)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, count]) => ({ time, count }));
    },
    enabled: !!currentSiteId && !!formattedRange.from && !!formattedRange.to,
  });
}

// Heatmap data (day x hour)
export function useHeatmapData(filters?: Omit<ChartFilters, 'dateRange'>) {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["heatmapData", currentSiteId, formattedRange.from, formattedRange.to, filters],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_date, operation_time, payment_mode, machine_name, machine, type")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to)
        .not("operation_time", "is", null);

      if (error) throw error;

      // Apply filters (except daysOfWeek for heatmap since it shows all days)
      const filtersWithoutDay = filters ? { ...filters, daysOfWeek: [] } : undefined;
      const filtered = applyFilters(data || [], filtersWithoutDay);

      const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      const heatmap: { day: string; hour: number; cycles: number }[] = [];

      // Initialize all slots
      const slots = new Map<string, number>();
      for (let d = 0; d < 7; d++) {
        for (let h = 7; h <= 21; h++) {
          slots.set(`${d}-${h}`, 0);
        }
      }

      filtered.forEach((op) => {
        const dayOfWeek = getDay(new Date(op.operation_date));
        const hour = parseInt(op.operation_time!.split(":")[0], 10);
        if (hour >= 7 && hour <= 21) {
          const key = `${dayOfWeek}-${hour}`;
          slots.set(key, (slots.get(key) || 0) + 1);
        }
      });

      // Convert to array, reorder from Monday
      [1, 2, 3, 4, 5, 6, 0].forEach((day) => {
        for (let h = 7; h <= 21; h++) {
          heatmap.push({
            day: dayNames[day],
            hour: h,
            cycles: slots.get(`${day}-${h}`) || 0,
          });
        }
      });

      return heatmap;
    },
    enabled: !!currentSiteId && !!formattedRange.from && !!formattedRange.to,
  });
}

// Machine statistics
export function useMachineStats(filters?: Omit<ChartFilters, 'dateRange'>) {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["machineStats", currentSiteId, formattedRange.from, formattedRange.to, filters],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("machine_name, machine, amount, type, operation_date, payment_mode")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to);

      if (error) throw error;

      // Apply filters (excluding machine filter for this chart)
      const filtersWithoutMachine = filters ? { ...filters, machines: [] } : undefined;
      const filtered = applyFilters(data || [], filtersWithoutMachine);

      const machines = new Map<string, { caEsp: number; caCb: number; caFi: number; ventesEsp: number; ventesCb: number; ventesFi: number; type: string }>();

      filtered.forEach((op) => {
        const name = op.machine_name || op.machine || "Inconnu";
        const existing = machines.get(name) || { caEsp: 0, caCb: 0, caFi: 0, ventesEsp: 0, ventesCb: 0, ventesFi: 0, type: op.type || "" };
        const amount = Number(op.amount || 0);
        
        if (isCBPayment(op)) {
          existing.caCb += amount;
          existing.ventesCb += 1;
        } else if (isESPPayment(op)) {
          existing.caEsp += amount;
          existing.ventesEsp += 1;
        } else if (isFIPayment(op)) {
          existing.caFi += amount;
          existing.ventesFi += 1;
        }
        
        if (!existing.type && op.type) existing.type = op.type;
        
        machines.set(name, existing);
      });

      return Array.from(machines.entries())
        .map(([name, stats]) => ({
          name,
          capacity: "",
          caEsp: stats.caEsp,
          caCb: stats.caCb,
          caTotal: stats.caEsp + stats.caCb + stats.caFi,
          ventesEsp: stats.ventesEsp,
          ventesCb: stats.ventesCb,
          ventesTotal: stats.ventesEsp + stats.ventesCb + stats.ventesFi,
          type: stats.type,
        }))
        .sort((a, b) => b.caTotal - a.caTotal);
    },
    enabled: !!currentSiteId && !!formattedRange.from && !!formattedRange.to,
  });
}

// Annual comparison data
export function useAnnualComparison(filters?: Omit<ChartFilters, 'dateRange'>) {
  const { currentSiteId } = useCurrentSite();

  return useQuery({
    queryKey: ["annualComparison", currentSiteId, filters],
    queryFn: async () => {
      if (!currentSiteId) return { monthlyData: [], yearTotals: {} };

      // Get last 5 years of data
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_date, amount, payment_mode, machine_name, machine, type")
        .eq("site_id", currentSiteId)
        .gte("operation_date", `${years[0]}-01-01`)
        .lte("operation_date", `${currentYear}-12-31`);

      if (error) throw error;

      // Apply filters (rechargements excluded automatically)
      const filtered = applyFilters(data || [], filters);

      // Initialize data structure
      const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
      const monthlyData = monthNames.map((month) => {
        const row: Record<string, any> = { month };
        years.forEach((y) => (row[`y${y}`] = 0));
        return row;
      });

      const yearTotals: Record<string, number> = {};
      years.forEach((y) => (yearTotals[`y${y}`] = 0));

      filtered.forEach((op) => {
        const date = new Date(op.operation_date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const revenue = Number(op.amount || 0);

        if (years.includes(year)) {
          monthlyData[month][`y${year}`] += revenue;
          yearTotals[`y${year}`] += revenue;
        }
      });

      return { monthlyData, yearTotals, years };
    },
    enabled: !!currentSiteId,
  });
}

// Occupancy rate data
export function useOccupancyRate(filters?: Omit<ChartFilters, 'dateRange'>) {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["occupancyRate", currentSiteId, formattedRange.from, formattedRange.to, filters],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("machine_name, machine, type, operation_date, payment_mode")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to);

      if (error) throw error;

      // Apply filters (excluding machine filter)
      const filtersWithoutMachine = filters ? { ...filters, machines: [] } : undefined;
      const filtered = applyFilters(data || [], filtersWithoutMachine);

      // Count cycles per machine
      const machines = new Map<string, { count: number; type: string }>();
      filtered.forEach((op) => {
        const name = op.machine_name || op.machine || "Inconnu";
        const existing = machines.get(name) || { count: 0, type: op.type || "" };
        existing.count += 1;
        if (!existing.type && op.type) existing.type = op.type;
        machines.set(name, existing);
      });

      // Calculate days in range
      const start = new Date(formattedRange.from);
      const end = new Date(formattedRange.to);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Optimal cycles per day (15h operation)
      const OPERATING_HOURS = 15;
      const WASHING_CYCLE = 40; // minutes
      const DRYER_CYCLE = 8; // minutes

      return Array.from(machines.entries()).map(([name, stats]) => {
        const isWashing = name.toLowerCase().includes("lave") || stats.type?.toLowerCase().includes("lave");
        const cycleDuration = isWashing ? WASHING_CYCLE : DRYER_CYCLE;
        const optimalPerDay = Math.floor((OPERATING_HOURS * 60) / cycleDuration);
        const cyclesOptimaux = optimalPerDay * days;
        const tauxOccupation = Math.round((stats.count / cyclesOptimaux) * 100);

        return {
          id: name,
          name,
          type: isWashing ? "LL" as const : "SL" as const,
          cyclesReels: stats.count,
          cyclesOptimaux,
          tauxOccupation: Math.min(tauxOccupation, 100),
        };
      }).sort((a, b) => b.tauxOccupation - a.tauxOccupation);
    },
    enabled: !!currentSiteId && !!formattedRange.from && !!formattedRange.to,
  });
}
