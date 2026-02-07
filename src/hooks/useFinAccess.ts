import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformRole } from "./usePlatformRole";

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
  is_platform_bypass?: boolean;
}

export function useFinAccess() {
  const { isPlatformSuperAdmin, isLoading: roleLoading } = usePlatformRole();

  const query = useQuery({
    queryKey: ["fin-access", isPlatformSuperAdmin],
    queryFn: async (): Promise<FinAccessInfo> => {
      // Platform super_admin has unlimited access without payment
      if (isPlatformSuperAdmin) {
        return {
          has_access: true,
          reason: "platform_super_admin",
          max_projects: 999,
          max_scenarios: 999,
          current_projects: 0,
          can_create_project: true,
          plan_code: "platform_unlimited",
          read_only: false,
          is_platform_bypass: true,
        };
      }

      const { data, error } = await supabase.rpc("rpc_has_fin_access");
      if (error) throw error;
      return data as unknown as FinAccessInfo;
    },
    staleTime: 60 * 1000, // Cache for 1 minute
    enabled: !roleLoading, // Wait for role check to complete
  });

  return {
    access: query.data,
    isLoading: query.isLoading || roleLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
