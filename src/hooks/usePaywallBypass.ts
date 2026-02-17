import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Checks if the current user is in the paywall_bypass_allowlist.
 * Uses SECURITY DEFINER RPC so the table is never queried directly from client.
 * Result is cached for the entire session.
 */
export function usePaywallBypass() {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: ["paywall-bypass"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_has_paywall_bypass");
      if (error) {
        console.error("Paywall bypass check failed:", error);
        return false;
      }
      return data === true;
    },
    enabled: isAuthenticated,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    isBypass: query.data === true,
    isLoading: query.isLoading,
  };
}
