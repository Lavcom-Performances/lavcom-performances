import { useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImportBatches } from "@/hooks/useImportBatches";
import { useSites } from "@/hooks/useSites";
import { useCurrentSite } from "@/hooks/useCurrentSite";

export interface SetupStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  route: string;
  icon: "building" | "upload" | "calculator" | "target" | "user";
}

interface SetupProgress {
  steps: SetupStep[];
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  isComplete: boolean;
  isLoading: boolean;
}

/**
 * Hook to track user setup/configuration progress
 * Tracks: site creation, CSV import, costs configuration, goals setup
 */
export function useSetupProgress(): SetupProgress {
  const { t } = useTranslation("app");
  const { user } = useAuth();
  const { sites, isLoading: sitesLoading } = useSites();
  const { batches, isLoading: batchesLoading } = useImportBatches();
  const { currentSiteId } = useCurrentSite();
  
  const [hasCosts, setHasCosts] = useState(false);
  const [hasGoals, setHasGoals] = useState(false);
  const [costsLoading, setCostsLoading] = useState(true);
  const [goalsLoading, setGoalsLoading] = useState(true);

  // Check if user has configured costs
  useEffect(() => {
    const checkCosts = async () => {
      if (!currentSiteId) {
        setCostsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("site_costs")
          .select("id")
          .eq("site_id", currentSiteId)
          .limit(1)
          .maybeSingle();

        if (!error) {
          setHasCosts(!!data);
        }
      } catch (err) {
        console.error("Error checking costs:", err);
      } finally {
        setCostsLoading(false);
      }
    };

    checkCosts();
  }, [currentSiteId]);

  // Check if user has configured goals
  useEffect(() => {
    const checkGoals = async () => {
      if (!user?.id) {
        setGoalsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_goals")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!error) {
          setHasGoals(!!data);
        }
      } catch (err) {
        console.error("Error checking goals:", err);
      } finally {
        setGoalsLoading(false);
      }
    };

    checkGoals();
  }, [user?.id]);

  const progress = useMemo(() => {
    const hasSite = sites.filter(s => !s.is_demo).length > 0;
    const hasImport = batches.length > 0;

    const steps: SetupStep[] = [
      {
        id: "site",
        label: t("setupProgress.steps.site.label"),
        description: t("setupProgress.steps.site.description"),
        completed: hasSite,
        route: "/laundromat-settings",
        icon: "building",
      },
      {
        id: "import",
        label: t("setupProgress.steps.import.label"),
        description: t("setupProgress.steps.import.description"),
        completed: hasImport,
        route: "/operations",
        icon: "upload",
      },
      {
        id: "costs",
        label: t("setupProgress.steps.costs.label"),
        description: t("setupProgress.steps.costs.description"),
        completed: hasCosts,
        route: "/settings/charges",
        icon: "calculator",
      },
      {
        id: "goals",
        label: t("setupProgress.steps.goals.label"),
        description: t("setupProgress.steps.goals.description"),
        completed: hasGoals,
        route: "/settings/objectives",
        icon: "target",
      },
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const totalSteps = steps.length;
    const progressPercent = Math.round((completedCount / totalSteps) * 100);

    return {
      steps,
      completedCount,
      totalSteps,
      progressPercent,
      isComplete: completedCount === totalSteps,
      isLoading: sitesLoading || batchesLoading || costsLoading || goalsLoading,
    };
  }, [sites, batches, hasCosts, hasGoals, sitesLoading, batchesLoading, costsLoading, goalsLoading, t]);

  return progress;
}
