import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformRole } from "./usePlatformRole";
import { usePaywallBypass } from "./usePaywallBypass";

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
  const { isBypass: isPaywallBypass, isLoading: bypassLoading } = usePaywallBypass();

  const query = useQuery({
    queryKey: ["fin-access", isPlatformSuperAdmin, isPaywallBypass],
    queryFn: async (): Promise<FinAccessInfo> => {
      // Platform super_admin OR paywall bypass has unlimited access
      // But still needs a workspace to create projects
      if (isPlatformSuperAdmin) {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Check if user already has a workspace
        let { data: workspace } = await supabase
          .from("fin_workspaces")
          .select("id")
          .eq("owner_user_id", user.id)
          .maybeSingle();

        // If no workspace exists, create one for the platform admin
        if (!workspace) {
          const { data: newWorkspace, error: createError } = await supabase
            .from("fin_workspaces")
            .insert({
              owner_user_id: user.id,
              max_projects: 999,
              max_scenarios_per_project: 999,
              plan_code: "platform_unlimited",
            })
            .select("id")
            .single();

          if (createError) {
            console.error("Failed to create workspace for platform admin:", createError);
            throw createError;
          }
          workspace = newWorkspace;
        }

        return {
          has_access: true,
          reason: "platform_super_admin",
          workspace_id: workspace.id,
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
    enabled: !roleLoading && !bypassLoading,
  });

  return {
    access: query.data,
    isLoading: query.isLoading || roleLoading || bypassLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
