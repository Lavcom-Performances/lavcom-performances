// Hook for fetching chart data from operations table with date range filtering
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { useDateRange } from "@/hooks/useDateRange";
import { getDay, format } from "date-fns";

// Daily revenue data
export function useDailyRevenue() {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["dailyRevenue", currentSiteId, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_date, price_cb, price_esp, amount")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to)
        .order("operation_date", { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped = new Map<string, { cb: number; esp: number }>();
      data?.forEach((op) => {
        const date = op.operation_date;
        const existing = grouped.get(date) || { cb: 0, esp: 0 };
        existing.cb += Number(op.price_cb || 0);
        existing.esp += Number(op.price_esp || 0);
        grouped.set(date, existing);
      });

      return Array.from(grouped.entries()).map(([date, values]) => ({
        date: format(new Date(date), "dd/MM"),
        fullDate: date,
        revenue: values.cb + values.esp,
        cb: values.cb,
        esp: values.esp,
      }));
    },
    enabled: !!currentSiteId && !!formattedRange.from && !!formattedRange.to,
  });
}

// Payment distribution data
export function usePaymentDistribution() {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["paymentDistribution", currentSiteId, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("price_cb, price_esp, payment_mode")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to);

      if (error) throw error;

      let totalCb = 0;
      let totalEsp = 0;
      let totalFi = 0;

      data?.forEach((op) => {
        totalCb += Number(op.price_cb || 0);
        totalEsp += Number(op.price_esp || 0);
        if (op.payment_mode?.toUpperCase() === "FI") {
          totalFi += Number(op.price_cb || 0) + Number(op.price_esp || 0);
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
export function useHourlyFrequency() {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["hourlyFrequency", currentSiteId, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_time")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to)
        .not("operation_time", "is", null);

      if (error) throw error;

      const hours: Record<number, number> = {};
      for (let i = 6; i <= 22; i++) hours[i] = 0;

      data?.forEach((op) => {
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
export function useDailyFrequency() {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["dailyFrequency", currentSiteId, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_date")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to);

      if (error) throw error;

      const days: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

      data?.forEach((op) => {
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
export function useHalfHourlyFrequency() {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["halfHourlyFrequency", currentSiteId, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_time")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to)
        .not("operation_time", "is", null);

      if (error) throw error;

      const slots: Record<string, number> = {};
      for (let h = 7; h <= 21; h++) {
        slots[`${h.toString().padStart(2, "0")}:00`] = 0;
        slots[`${h.toString().padStart(2, "0")}:30`] = 0;
      }

      data?.forEach((op) => {
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
export function useHeatmapData() {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["heatmapData", currentSiteId, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_date, operation_time")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to)
        .not("operation_time", "is", null);

      if (error) throw error;

      const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      const heatmap: { day: string; hour: number; cycles: number }[] = [];

      // Initialize all slots
      const slots = new Map<string, number>();
      for (let d = 0; d < 7; d++) {
        for (let h = 7; h <= 21; h++) {
          slots.set(`${d}-${h}`, 0);
        }
      }

      data?.forEach((op) => {
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
export function useMachineStats() {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["machineStats", currentSiteId, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("machine_name, machine, price_cb, price_esp, type")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to);

      if (error) throw error;

      const machines = new Map<string, { caEsp: number; caCb: number; ventesEsp: number; ventesCb: number; type: string }>();

      data?.forEach((op) => {
        const name = op.machine_name || op.machine || "Inconnu";
        const existing = machines.get(name) || { caEsp: 0, caCb: 0, ventesEsp: 0, ventesCb: 0, type: op.type || "" };
        
        existing.caCb += Number(op.price_cb || 0);
        existing.caEsp += Number(op.price_esp || 0);
        
        if (Number(op.price_cb || 0) > 0) existing.ventesCb += 1;
        if (Number(op.price_esp || 0) > 0) existing.ventesEsp += 1;
        if (!existing.type && op.type) existing.type = op.type;
        
        machines.set(name, existing);
      });

      return Array.from(machines.entries())
        .map(([name, stats]) => ({
          name,
          capacity: "",
          caEsp: stats.caEsp,
          caCb: stats.caCb,
          caTotal: stats.caEsp + stats.caCb,
          ventesEsp: stats.ventesEsp,
          ventesCb: stats.ventesCb,
          ventesTotal: stats.ventesEsp + stats.ventesCb,
          type: stats.type,
        }))
        .sort((a, b) => b.caTotal - a.caTotal);
    },
    enabled: !!currentSiteId && !!formattedRange.from && !!formattedRange.to,
  });
}

// Annual comparison data
export function useAnnualComparison() {
  const { currentSiteId } = useCurrentSite();

  return useQuery({
    queryKey: ["annualComparison", currentSiteId],
    queryFn: async () => {
      if (!currentSiteId) return { monthlyData: [], yearTotals: {} };

      // Get last 5 years of data
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];

      const { data, error } = await supabase
        .from("operations")
        .select("operation_date, price_cb, price_esp")
        .eq("site_id", currentSiteId)
        .gte("operation_date", `${years[0]}-01-01`)
        .lte("operation_date", `${currentYear}-12-31`);

      if (error) throw error;

      // Initialize data structure
      const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
      const monthlyData = monthNames.map((month) => {
        const row: Record<string, any> = { month };
        years.forEach((y) => (row[`y${y}`] = 0));
        return row;
      });

      const yearTotals: Record<string, number> = {};
      years.forEach((y) => (yearTotals[`y${y}`] = 0));

      data?.forEach((op) => {
        const date = new Date(op.operation_date);
        const year = date.getFullYear();
        const month = date.getMonth();
        const revenue = Number(op.price_cb || 0) + Number(op.price_esp || 0);

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
export function useOccupancyRate() {
  const { currentSiteId } = useCurrentSite();
  const { formattedRange } = useDateRange();

  return useQuery({
    queryKey: ["occupancyRate", currentSiteId, formattedRange.from, formattedRange.to],
    queryFn: async () => {
      if (!currentSiteId || !formattedRange.from || !formattedRange.to) return [];

      const { data, error } = await supabase
        .from("operations")
        .select("machine_name, machine, type")
        .eq("site_id", currentSiteId)
        .gte("operation_date", formattedRange.from)
        .lte("operation_date", formattedRange.to);

      if (error) throw error;

      // Count cycles per machine
      const machines = new Map<string, { count: number; type: string }>();
      data?.forEach((op) => {
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
