import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Simple hook to check if the current user's organization is in beta.
 * Does not require passing an organization ID.
 */
export function useIsBetaCompany() {
  const { user } = useAuth();
  const [isBeta, setIsBeta] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsBeta(false);
      setIsLoading(false);
      return;
    }

    const checkBetaStatus = async () => {
      try {
        // Get user's organization
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (!userRole?.organization_id) {
          // Also check if user owns an organization
          const { data: ownedOrg } = await supabase
            .from("organizations")
            .select("id, is_beta")
            .eq("owner_id", user.id)
            .limit(1)
            .single();

          setIsBeta(ownedOrg?.is_beta || false);
        } else {
          const { data: org } = await supabase
            .from("organizations")
            .select("is_beta")
            .eq("id", userRole.organization_id)
            .single();

          setIsBeta(org?.is_beta || false);
        }
      } catch (err) {
        console.warn("Error checking beta status:", err);
        setIsBeta(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkBetaStatus();
  }, [user?.id]);

  return { isBeta, isLoading };
}
