import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FinForecast {
  id: string;
  project_id: string;
  scenario_id: string | null;
  year: number;
  month: number;
  revenue: number;
  costs: number;
  ebitda: number;
  cashflow: number;
  depreciation: number;
  net_income: number;
  cumulative_cashflow: number;
  hypothesis_version: number;
  created_at: string;
}

export interface AnnualSummary {
  year: number;
  total_revenue: number;
  total_costs: number;
  total_ebitda: number;
  total_cashflow: number;
  final_cumulative: number;
}

export function useFinForecasts(projectId: string | undefined, scenarioId?: string | null) {
  return useQuery({
    queryKey: ["fin-forecasts", projectId, scenarioId],
    queryFn: async (): Promise<FinForecast[]> => {
      if (!projectId) throw new Error("No project ID");
      
      let query = supabase
        .from("fin_forecasts")
        .select("*")
        .eq("project_id", projectId)
        .order("year", { ascending: true })
        .order("month", { ascending: true });
      
      if (scenarioId) {
        query = query.eq("scenario_id", scenarioId);
      } else {
        query = query.is("scenario_id", null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FinForecast[];
    },
    enabled: !!projectId,
  });
}

export function useComputeForecast() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, scenarioId, horizonYears = 3 }: { 
      projectId: string; 
      scenarioId?: string | null;
      horizonYears?: number;
    }) => {
      const { data, error } = await supabase.rpc("rpc_compute_fin_forecast", {
        p_project_id: projectId,
        p_scenario_id: scenarioId || null,
        p_horizon_years: horizonYears,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fin-forecasts", variables.projectId] });
      toast({ title: "Prévisionnel calculé", description: "Les projections ont été mises à jour." });
    },
    onError: (error: Error) => {
      // Check for specific error codes
      const message = error.message || "";
      
      if (message.includes("MISSING_LINE_ITEMS")) {
        // Extract the user-friendly message
        const cleanMessage = message.replace("MISSING_LINE_ITEMS:", "").trim();
        toast({ 
          title: "Configuration requise", 
          description: cleanMessage || "Ajoutez au moins une ligne machine/service avec un prix et un taux d'utilisation.",
          variant: "default",
        });
      } else {
        toast({ 
          title: "Erreur de calcul", 
          description: message,
          variant: "destructive" 
        });
      }
    },
  });
}

export function useAnnualSummary(forecasts: FinForecast[] | undefined): AnnualSummary[] {
  if (!forecasts || forecasts.length === 0) return [];
  
  const byYear = new Map<number, FinForecast[]>();
  forecasts.forEach(f => {
    const arr = byYear.get(f.year) || [];
    arr.push(f);
    byYear.set(f.year, arr);
  });
  
  const summaries: AnnualSummary[] = [];
  byYear.forEach((items, year) => {
    summaries.push({
      year,
      total_revenue: items.reduce((s, f) => s + Number(f.revenue), 0),
      total_costs: items.reduce((s, f) => s + Number(f.costs), 0),
      total_ebitda: items.reduce((s, f) => s + Number(f.ebitda), 0),
      total_cashflow: items.reduce((s, f) => s + Number(f.cashflow), 0),
      final_cumulative: items[items.length - 1]?.cumulative_cashflow || 0,
    });
  });
  
  return summaries.sort((a, b) => a.year - b.year);
}
