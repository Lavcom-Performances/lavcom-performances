import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSite } from "@/hooks/useCurrentSite";

interface HasOperationsStatus {
  /** User has at least one operation for the current site */
  hasOperations: boolean;
  /** No site is selected */
  noSiteSelected: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Retry function */
  refetch: () => void;
}

/**
 * Hook to check if user has any operations for the current site
 * Uses a minimal query (SELECT 1 LIMIT 1) for performance
 */
export function useHasOperations(): HasOperationsStatus {
  const { currentSiteId, isLoading: siteLoading } = useCurrentSite();
  const [hasOperations, setHasOperations] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHasOperations = async () => {
    if (!currentSiteId) {
      setIsLoading(false);
      setHasOperations(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("operations")
        .select("id")
        .eq("site_id", currentSiteId)
        .limit(1)
        .maybeSingle();

      if (queryError) {
        throw new Error(queryError.message);
      }

      setHasOperations(!!data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to check operations"));
      setHasOperations(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!siteLoading) {
      fetchHasOperations();
    }
  }, [currentSiteId, siteLoading]);

  return {
    hasOperations,
    noSiteSelected: !currentSiteId && !siteLoading,
    isLoading: isLoading || siteLoading,
    error,
    refetch: fetchHasOperations,
  };
}
