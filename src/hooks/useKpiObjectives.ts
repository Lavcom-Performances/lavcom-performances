import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format, startOfMonth } from "date-fns";

export interface KpiObjective {
  id: string;
  company_id: string;
  site_id: string | null;
  period_month: string;
  scope: "GLOBAL" | "CATEGORY" | "MACHINE";
  category: string | null;
  machine_label: string | null;
  objective_amount_cents: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useKpiObjectives(monthDate?: Date) {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const companyId = organization?.id;
  const month = monthDate
    ? format(startOfMonth(monthDate), "yyyy-MM-dd")
    : format(startOfMonth(new Date()), "yyyy-MM-dd");

  const query = useQuery({
    queryKey: ["kpiObjectives", companyId, month],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("kpi_objectives")
        .select("*")
        .eq("company_id", companyId)
        .eq("period_month", month);
      if (error) throw error;
      return (data ?? []) as KpiObjective[];
    },
    enabled: !!companyId,
  });

  const upsertObjective = useMutation({
    mutationFn: async (obj: {
      scope: "GLOBAL" | "CATEGORY" | "MACHINE";
      category?: string;
      machine_label?: string;
      objective_amount_cents: number;
      site_id?: string;
    }) => {
      if (!companyId) throw new Error("No company");

      // Check for existing
      let existing = query.data?.find(
        (o) =>
          o.scope === obj.scope &&
          o.category === (obj.category ?? null) &&
          o.machine_label === (obj.machine_label ?? null)
      );

      if (existing) {
        const { error } = await supabase
          .from("kpi_objectives")
          .update({
            objective_amount_cents: obj.objective_amount_cents,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("kpi_objectives")
          .insert({
            company_id: companyId,
            site_id: obj.site_id ?? null,
            period_month: month,
            scope: obj.scope,
            category: obj.category ?? null,
            machine_label: obj.machine_label ?? null,
            objective_amount_cents: obj.objective_amount_cents,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpiObjectives", companyId, month] });
    },
  });

  // Helpers
  const globalObjective = query.data?.find((o) => o.scope === "GLOBAL");
  const categoryObjectives = query.data?.filter((o) => o.scope === "CATEGORY") ?? [];

  return {
    objectives: query.data ?? [],
    globalObjective,
    categoryObjectives,
    isLoading: query.isLoading,
    upsertObjective,
  };
}
