import { useMemo } from "react";
import { useImportBatches } from "@/hooks/useImportBatches";
import { useSites } from "@/hooks/useSites";
import { useDashboardStats } from "@/hooks/useDashboardStats";

interface OnboardingStatus {
  /** User has at least one site */
  hasSite: boolean;
  /** User has imported data at least once */
  hasImport: boolean;
  /** User has actual data/analytics available */
  hasData: boolean;
  /** All onboarding steps are complete */
  isComplete: boolean;
  /** Number of completed steps (0-3) */
  completedCount: number;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook to track user onboarding progress
 * Returns status of each onboarding step
 */
export function useOnboardingStatus(): OnboardingStatus {
  const { sites, isLoading: sitesLoading } = useSites();
  const { batches, isLoading: batchesLoading } = useImportBatches();
  const { isEmpty, isLoading: statsLoading } = useDashboardStats();

  const status = useMemo(() => {
    const hasSite = sites.filter(s => !s.is_demo).length > 0;
    const hasImport = batches.length > 0;
    const hasData = !isEmpty;

    const completedCount = [hasSite, hasImport, hasData].filter(Boolean).length;

    return {
      hasSite,
      hasImport,
      hasData,
      isComplete: completedCount === 3,
      completedCount,
      isLoading: sitesLoading || batchesLoading || statsLoading,
    };
  }, [sites, batches, isEmpty, sitesLoading, batchesLoading, statsLoading]);

  return status;
}
