import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export type HypothesisCategory = "INVESTMENT" | "REVENUE" | "COST" | "FINANCING";

export interface FinHypothesis {
  id: string;
  project_id: string;
  category: HypothesisCategory;
  key: string;
  value: number;
  label: string | null;
  unit: string | null;
  meta: Json;
  version: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_HYPOTHESES: { category: HypothesisCategory; key: string; value: number; label: string; unit: string; meta: Json }[] = [
  // Investissement
  { category: "INVESTMENT", key: "initial_investment", value: 80000, label: "Investissement initial", unit: "€", meta: {} },
  { category: "INVESTMENT", key: "depreciation_years", value: 7, label: "Durée d'amortissement", unit: "ans", meta: {} },
  
  // Revenus
  { category: "REVENUE", key: "monthly_revenue", value: 5000, label: "CA mensuel estimé", unit: "€/mois", meta: {} },
  { category: "REVENUE", key: "annual_growth_rate", value: 0.05, label: "Croissance annuelle", unit: "%", meta: { isPercentage: true } },
  
  // Charges
  { category: "COST", key: "fixed_costs", value: 1500, label: "Charges fixes mensuelles", unit: "€/mois", meta: {} },
  { category: "COST", key: "variable_cost_rate", value: 0.15, label: "Taux de charges variables", unit: "%", meta: { isPercentage: true } },
  
  // Financement
  { category: "FINANCING", key: "loan_amount", value: 50000, label: "Montant du prêt", unit: "€", meta: {} },
  { category: "FINANCING", key: "loan_rate", value: 0.04, label: "Taux d'intérêt", unit: "%", meta: { isPercentage: true } },
  { category: "FINANCING", key: "loan_years", value: 7, label: "Durée du prêt", unit: "ans", meta: {} },
];

export function useFinHypotheses(projectId: string | undefined) {
  return useQuery({
    queryKey: ["fin-hypotheses", projectId],
    queryFn: async (): Promise<FinHypothesis[]> => {
      if (!projectId) throw new Error("No project ID");
      const { data, error } = await supabase
        .from("fin_hypotheses")
        .select("*")
        .eq("project_id", projectId)
        .order("category", { ascending: true });
      if (error) throw error;
      return data as FinHypothesis[];
    },
    enabled: !!projectId,
  });
}

export function useInitializeHypotheses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const hypotheses = DEFAULT_HYPOTHESES.map(h => ({
        ...h,
        project_id: projectId,
      }));
      
      const { error } = await supabase
        .from("fin_hypotheses")
        .insert(hypotheses);
      
      if (error) throw error;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["fin-hypotheses", projectId] });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useUpdateHypothesis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number; projectId: string }) => {
      const { error } = await supabase
        .from("fin_hypotheses")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fin-hypotheses", variables.projectId] });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}
