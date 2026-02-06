import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinAccessInfo {
  has_access: boolean;
  reason?: string;
  workspace_id?: string;
  access_ends_at?: string;
  max_projects?: number;
  max_scenarios?: number;
  current_projects?: number;
  can_create_project?: boolean;
  plan_code?: string;
  read_only?: boolean;
  expired_at?: string;
}

export function useFinAccess() {
  const query = useQuery({
    queryKey: ["fin-access"],
    queryFn: async (): Promise<FinAccessInfo> => {
      const { data, error } = await supabase.rpc("rpc_has_fin_access");
      if (error) throw error;
      return data as unknown as FinAccessInfo;
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  });

  return {
    access: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
