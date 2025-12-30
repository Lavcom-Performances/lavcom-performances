import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfDay, isWithinInterval, format } from "date-fns";
import { DateRange } from "react-day-picker";

export interface Operation {
  id: string;
  operation_date: string;
  operation_time: string | null;
  amount: number;
  machine: string | null;
  program: string | null;
  payment_mode: string | null;
  site_id: string;
  created_at: string;
  // Extended fields for Events format
  inserted_eur?: number | null;
  price_eur?: number | null;
  change_eur?: number | null;
  machine_name?: string | null;
  source?: string | null;
}

export interface OperationsFilters {
  dateRange?: DateRange;
  searchQuery?: string;
  category?: string;
  paymentMode?: string;
  siteId?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface MonthSummary {
  month: string; // YYYY-MM
  count: number;
  firstRowIndex: number;
}

export function useOperations(
  filters: OperationsFilters = {},
  pagination: PaginationState = { page: 1, pageSize: 50 }
) {
  const { user } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [monthSummaries, setMonthSummaries] = useState<MonthSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperations = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build base query
      let countQuery = supabase
        .from("operations")
        .select("*", { count: "exact", head: true });

      let dataQuery = supabase
        .from("operations")
        .select("*")
        .order("operation_date", { ascending: false })
        .order("operation_time", { ascending: false });

      // Apply site filter
      if (filters.siteId) {
        countQuery = countQuery.eq("site_id", filters.siteId);
        dataQuery = dataQuery.eq("site_id", filters.siteId);
      }

      // Apply date range filter at DB level
      if (filters.dateRange?.from) {
        const fromDate = format(filters.dateRange.from, "yyyy-MM-dd");
        countQuery = countQuery.gte("operation_date", fromDate);
        dataQuery = dataQuery.gte("operation_date", fromDate);
      }
      if (filters.dateRange?.to) {
        const toDate = format(filters.dateRange.to, "yyyy-MM-dd");
        countQuery = countQuery.lte("operation_date", toDate);
        dataQuery = dataQuery.lte("operation_date", toDate);
      }

      // Apply payment mode filter at DB level
      if (filters.paymentMode && filters.paymentMode !== "all") {
        countQuery = countQuery.ilike("payment_mode", filters.paymentMode);
        dataQuery = dataQuery.ilike("payment_mode", filters.paymentMode);
      }

      // Apply search filter at DB level (machine name)
      if (filters.searchQuery) {
        const searchPattern = `%${filters.searchQuery}%`;
        countQuery = countQuery.or(`machine.ilike.${searchPattern},machine_name.ilike.${searchPattern},program.ilike.${searchPattern}`);
        dataQuery = dataQuery.or(`machine.ilike.${searchPattern},machine_name.ilike.${searchPattern},program.ilike.${searchPattern}`);
      }

      // Get total count first
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      setTotalCount(count || 0);

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.pageSize;
      dataQuery = dataQuery.range(offset, offset + pagination.pageSize - 1);

      const { data, error: fetchError } = await dataQuery;
      if (fetchError) throw fetchError;

      console.log(`[useOperations] Fetched page ${pagination.page}, ${data?.length || 0}/${count} operations`);
      setOperations(data || []);

      // Fetch month summaries for navigation (only if we have a site)
      if (filters.siteId && count && count > 0) {
        fetchMonthSummaries(filters.siteId, filters.dateRange);
      }
    } catch (err) {
      console.error("Error fetching operations:", err);
      setError("Impossible de charger les opérations");
    } finally {
      setIsLoading(false);
    }
  }, [user, filters.siteId, filters.dateRange?.from?.toISOString(), filters.dateRange?.to?.toISOString(), filters.paymentMode, filters.searchQuery, pagination.page, pagination.pageSize]);

  const fetchMonthSummaries = async (siteId: string, dateRange?: DateRange) => {
    try {
      // Get count per month for navigation
      let query = supabase
        .from("operations")
        .select("operation_date")
        .eq("site_id", siteId)
        .order("operation_date", { ascending: false });

      if (dateRange?.from) {
        query = query.gte("operation_date", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange?.to) {
        query = query.lte("operation_date", format(dateRange.to, "yyyy-MM-dd"));
      }

      // Fetch all dates to compute month summaries
      const { data, error } = await query.limit(100000);
      if (error || !data) return;

      // Group by month
      const monthCounts = new Map<string, number>();
      data.forEach(op => {
        const month = op.operation_date.substring(0, 7);
        monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
      });

      // Convert to summaries with cumulative row indices
      const summaries: MonthSummary[] = [];
      let cumulativeIndex = 0;
      
      // Sort months descending
      const sortedMonths = Array.from(monthCounts.entries())
        .sort((a, b) => b[0].localeCompare(a[0]));
      
      for (const [month, count] of sortedMonths) {
        summaries.push({
          month,
          count,
          firstRowIndex: cumulativeIndex,
        });
        cumulativeIndex += count;
      }

      setMonthSummaries(summaries);
    } catch (err) {
      console.error("Error fetching month summaries:", err);
    }
  };

  useEffect(() => {
    if (!user) {
      setOperations([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    fetchOperations();
  }, [fetchOperations]);

  // Apply client-side category filter (complex pattern matching)
  const filteredOperations = useMemo(() => {
    if (!filters.category || filters.category === "all") {
      return operations;
    }

    return operations.filter((op) => {
      const machineLower = (op.machine_name || op.machine || "").toLowerCase();
      switch (filters.category) {
        case "LAVE_LINGE":
          return machineLower.includes("lave") || machineLower.includes("laveuse");
        case "SECHE_LINGE":
          return machineLower.includes("sèche") || machineLower.includes("seche") || machineLower.includes("séchoir");
        case "LESSIVE":
          return machineLower.includes("lessive") || machineLower.includes("distributeur");
        default:
          return true;
      }
    });
  }, [operations, filters.category]);

  const totalPages = Math.ceil(totalCount / pagination.pageSize);

  return {
    operations: filteredOperations,
    allOperations: operations,
    totalCount,
    totalPages,
    monthSummaries,
    isLoading,
    error,
    refetch: fetchOperations,
    isEmpty: !isLoading && totalCount === 0,
  };
}
