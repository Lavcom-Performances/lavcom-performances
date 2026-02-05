/**
 * TAEX-302: Hook to check if recommendations are suppressed for current user's organization
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseRecommendationsSuppressedResult {
  isSuppressed: boolean;
  isLoading: boolean;
}

export function useRecommendationsSuppressed(): UseRecommendationsSuppressedResult {
  const { user } = useAuth();
  const [isSuppressed, setIsSuppressed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsSuppressed(false);
      setIsLoading(false);
      return;
    }

    const checkSuppression = async () => {
      try {
        // First get user's organization
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (!userRole?.organization_id) {
          // Check if user owns an organization
          const { data: ownedOrg } = await supabase
            .from("organizations")
            .select("id")
            .eq("owner_id", user.id)
            .limit(1)
            .single();

          if (!ownedOrg?.id) {
            setIsSuppressed(false);
            setIsLoading(false);
            return;
          }

          // Check suppression for owned org
          const { data: suppressed } = await supabase.rpc(
            "rpc_is_recommendations_suppressed",
            { p_organization_id: ownedOrg.id }
          );
          setIsSuppressed(suppressed === true);
        } else {
          // Check suppression for org from user_roles
          const { data: suppressed } = await supabase.rpc(
            "rpc_is_recommendations_suppressed",
            { p_organization_id: userRole.organization_id }
          );
          setIsSuppressed(suppressed === true);
        }
      } catch (err) {
        console.warn("Error checking recommendations suppression:", err);
        setIsSuppressed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSuppression();
  }, [user?.id]);

  return { isSuppressed, isLoading };
}
