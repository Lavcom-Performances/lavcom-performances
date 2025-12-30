import { useMemo } from "react";
import { getDay } from "date-fns";
import { ChartFilters } from "@/components/charts/ChartPageFilters";

interface Operation {
  operation_date: string;
  operation_time?: string | null;
  payment_mode?: string | null;
  machine_name?: string | null;
  machine?: string | null;
  type?: string | null;
  price_cb?: number | null;
  price_esp?: number | null;
  amount?: number | null;
}

export function useFilteredData<T extends Operation>(
  data: T[] | undefined,
  filters: Omit<ChartFilters, 'dateRange'>
): T[] {
  return useMemo(() => {
    if (!data) return [];
    
    return data.filter(op => {
      // Payment mode filter
      if (filters.paymentMode !== "all") {
        const mode = op.payment_mode?.toUpperCase();
        if (mode !== filters.paymentMode) return false;
      }
      
      // Machine type filter
      if (filters.machineType !== "all") {
        const machineName = (op.machine_name || op.machine || "").toLowerCase();
        const type = op.type?.toLowerCase() || "";
        
        if (filters.machineType === "LL") {
          const isWashing = machineName.includes("lave") || type.includes("lave") || type === "ll";
          if (!isWashing) return false;
        } else if (filters.machineType === "SL") {
          const isDrying = machineName.includes("sèche") || machineName.includes("seche") || 
                          type.includes("sèche") || type.includes("seche") || type === "sl";
          if (!isDrying) return false;
        }
      }
      
      // Specific machine filter
      if (filters.machine !== "all") {
        const machineName = op.machine_name || op.machine;
        if (machineName !== filters.machine) return false;
      }
      
      // Day of week filter
      if (filters.dayOfWeek !== "all") {
        const dayOfWeek = getDay(new Date(op.operation_date));
        if (dayOfWeek.toString() !== filters.dayOfWeek) return false;
      }
      
      return true;
    });
  }, [data, filters]);
}
