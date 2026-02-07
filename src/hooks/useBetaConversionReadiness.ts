/**
 * TAEX-307: Beta Conversion Readiness Hook
 * 
 * Helper to check if a company is ready for conversion.
 * Exposed as: isBetaReadyForConversion(company_id): boolean
 */
import { useQuery } from "@tanstack/react-query";
import { differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface ConversionReadiness {
  isReady: boolean;
  isLoading: boolean;
  criteria: {
    isActivated: boolean;
    daysActive: number;
    successfulImports: number;
    hasDtsIssues: boolean;
    recommendationsSuppressed: boolean;
  };
}

/**
 * Check if a specific company is ready for conversion from beta to paid.
 * 
 * A company is ready when:
 * - Activated = true
 * - ≥ 30 days since first activity
 * - ≥ 3 successful imports
 * - No blocking DTS issues (score >= 60)
 * - Recommendations not suppressed
 */
export function useBetaConversionReadiness(companyId: string | null): ConversionReadiness {
  const { data, isLoading } = useQuery({
    queryKey: ["beta-conversion-readiness", companyId],
    queryFn: async () => {
      if (!companyId) {
        return {
          isActivated: false,
          daysActive: 0,
          successfulImports: 0,
          hasDtsIssues: false,
          recommendationsSuppressed: false,
        };
      }

      // Get organization beta info
      const { data: org } = await supabase
        .from("organizations")
        .select("is_beta, beta_started_at")
        .eq("id", companyId)
        .single();

      if (!org?.is_beta) {
        return {
          isActivated: false,
          daysActive: 0,
          successfulImports: 0,
          hasDtsIssues: false,
          recommendationsSuppressed: false,
        };
      }

      // Calculate days since beta started
      const daysActive = org.beta_started_at
        ? differenceInDays(new Date(), new Date(org.beta_started_at))
        : 0;

      // Get import count
      const { count: importCount } = await supabase
        .from("import_batches")
        .select("*", { count: "exact", head: true })
        .eq("site_id", companyId)
        .is("deleted_at", null);

      // Get latest DTS score
      const { data: trustData } = await supabase
        .from("trust_day")
        .select("dts_score")
        .eq("company_id", companyId)
        .order("day", { ascending: false })
        .limit(1);

      // Get suppression status
      const { data: overrides } = await supabase
        .from("beta_company_overrides")
        .select("recommendations_suppressed")
        .eq("company_id", companyId)
        .maybeSingle();

      const hasDtsIssues = trustData?.[0]?.dts_score ? trustData[0].dts_score < 60 : false;
      const recommendationsSuppressed = overrides?.recommendations_suppressed || false;
      const successfulImports = importCount || 0;
      const isActivated = successfulImports >= 1 && !hasDtsIssues;

      return {
        isActivated,
        daysActive,
        successfulImports,
        hasDtsIssues,
        recommendationsSuppressed,
      };
    },
    enabled: !!companyId,
    staleTime: 60000, // 1 minute
  });

  const criteria = data || {
    isActivated: false,
    daysActive: 0,
    successfulImports: 0,
    hasDtsIssues: false,
    recommendationsSuppressed: false,
  };

  // Apply conversion readiness logic
  const isReady =
    criteria.isActivated &&
    criteria.daysActive >= 30 &&
    criteria.successfulImports >= 3 &&
    !criteria.hasDtsIssues &&
    !criteria.recommendationsSuppressed;

  return {
    isReady,
    isLoading,
    criteria,
  };
}

/**
 * Simple helper function to check conversion readiness.
 * For use in non-hook contexts, returns a promise.
 */
export async function isBetaReadyForConversion(companyId: string): Promise<boolean> {
  try {
    // Get organization beta info
    const { data: org } = await supabase
      .from("organizations")
      .select("is_beta, beta_started_at")
      .eq("id", companyId)
      .single();

    if (!org?.is_beta) return false;

    const daysActive = org.beta_started_at
      ? differenceInDays(new Date(), new Date(org.beta_started_at))
      : 0;

    if (daysActive < 30) return false;

    // Get import count
    const { count: importCount } = await supabase
      .from("import_batches")
      .select("*", { count: "exact", head: true })
      .eq("site_id", companyId)
      .is("deleted_at", null);

    if ((importCount || 0) < 3) return false;

    // Get latest DTS score
    const { data: trustData } = await supabase
      .from("trust_day")
      .select("dts_score")
      .eq("company_id", companyId)
      .order("day", { ascending: false })
      .limit(1);

    if (trustData?.[0]?.dts_score && trustData[0].dts_score < 60) return false;

    // Get suppression status
    const { data: overrides } = await supabase
      .from("beta_company_overrides")
      .select("recommendations_suppressed")
      .eq("company_id", companyId)
      .maybeSingle();

    if (overrides?.recommendations_suppressed) return false;

    return true;
  } catch (err) {
    console.error("Error checking conversion readiness:", err);
    return false;
  }
}
