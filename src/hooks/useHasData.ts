import { useMemo } from "react";
import { useImportBatches } from "@/hooks/useImportBatches";

interface HasDataStatus {
  /** User has imported data at least once */
  hasData: boolean;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Simple hook to check if user has any imported data
 * Uses import_batches as source of truth
 */
export function useHasData(): HasDataStatus {
  const { batches, isLoading } = useImportBatches();

  const status = useMemo(() => {
    return {
      hasData: batches.length > 0,
      isLoading,
    };
  }, [batches, isLoading]);

  return status;
}
