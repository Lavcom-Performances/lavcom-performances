import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfDay, isWithinInterval } from "date-fns";
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

export function useOperations(filters: OperationsFilters = {}) {
  const { user } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOperations([]);
      setIsLoading(false);
      return;
    }

    console.log('[useOperations] Fetching for user:', user.id, 'site:', filters.siteId);
    fetchOperations();
  }, [user, filters.siteId]);

  const fetchOperations = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // DEBUG: Fetch all operations without site filter to diagnose
      console.log('[useOperations] DEBUG - Fetching ALL operations for user:', user.id);
      
      let query = supabase
        .from("operations")
        .select("*")
        .order("operation_date", { ascending: false })
        .order("operation_time", { ascending: false });

      // Temporarily disabled site filter for debugging
      // if (filters.siteId) {
      //   query = query.eq("site_id", filters.siteId);
      // }

      // Increase limit for better data coverage
      const { data, error: fetchError } = await query.limit(5000);

      if (fetchError) {
        console.error('[useOperations] Supabase error:', fetchError);
        throw fetchError;
      }

      console.log(`[useOperations] Fetched ${data?.length || 0} operations (no site filter)`);
      console.log('[useOperations] Sample data:', data?.slice(0, 3));
      setOperations(data || []);
    } catch (err) {
      console.error("Error fetching operations:", err);
      setError("Impossible de charger les opérations");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply client-side filters
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesMachine = op.machine?.toLowerCase().includes(query);
        const matchesProgram = op.program?.toLowerCase().includes(query);
        if (!matchesMachine && !matchesProgram) return false;
      }

      // Category filter (based on machine name pattern)
      if (filters.category && filters.category !== "all") {
        const machineLower = op.machine?.toLowerCase() || "";
        switch (filters.category) {
          case "LAVE_LINGE":
            if (!machineLower.includes("lave") && !machineLower.includes("laveuse")) return false;
            break;
          case "SECHE_LINGE":
            if (!machineLower.includes("sèche") && !machineLower.includes("seche") && !machineLower.includes("séchoir")) return false;
            break;
          case "LESSIVE":
            if (!machineLower.includes("lessive") && !machineLower.includes("distributeur")) return false;
            break;
        }
      }

      // Payment mode filter
      if (filters.paymentMode && filters.paymentMode !== "all") {
        if (op.payment_mode?.toUpperCase() !== filters.paymentMode) return false;
      }

      // Date range filter
      if (filters.dateRange?.from && filters.dateRange?.to) {
        const opDate = new Date(op.operation_date);
        const isInRange = isWithinInterval(startOfDay(opDate), {
          start: startOfDay(filters.dateRange.from),
          end: startOfDay(filters.dateRange.to),
        });
        if (!isInRange) return false;
      }

      return true;
    });
  }, [operations, filters]);

  return {
    operations: filteredOperations,
    allOperations: operations,
    isLoading,
    error,
    refetch: fetchOperations,
    isEmpty: !isLoading && operations.length === 0,
  };
}
