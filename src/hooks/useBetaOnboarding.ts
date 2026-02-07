import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsBetaCompany } from "@/hooks/useIsBetaCompany";
import { useBetaEvents } from "@/hooks/useBetaEvents";
import { supabase } from "@/integrations/supabase/client";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  link: string;
  completed: boolean;
}

interface BetaOnboardingState {
  welcome_dismissed: boolean;
  checklist_opened: boolean;
  completed_items: Record<string, boolean>;
}

const DEFAULT_STATE: BetaOnboardingState = {
  welcome_dismissed: false,
  checklist_opened: false,
  completed_items: {},
};

function getStorageKey(companyId: string, userId: string): string {
  return `beta_onboarding_state:${companyId}:${userId}`;
}

export function useBetaOnboarding() {
  const { user } = useAuth();
  const { isBeta, isLoading: isBetaLoading } = useIsBetaCompany();
  const { logBetaEvent } = useBetaEvents();
  
  const [state, setState] = useState<BetaOnboardingState>(DEFAULT_STATE);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [betaEndsAt, setBetaEndsAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch company info
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchCompanyInfo = async () => {
      try {
        // Get user's organization
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        let orgId = userRole?.organization_id;

        if (!orgId) {
          // Check if user owns an organization
          const { data: ownedOrg } = await supabase
            .from("organizations")
            .select("id, beta_ends_at")
            .eq("owner_id", user.id)
            .limit(1)
            .single();

          if (ownedOrg) {
            orgId = ownedOrg.id;
            setBetaEndsAt(ownedOrg.beta_ends_at);
          }
        } else {
          const { data: org } = await supabase
            .from("organizations")
            .select("beta_ends_at")
            .eq("id", orgId)
            .single();

          if (org) {
            setBetaEndsAt(org.beta_ends_at);
          }
        }

        setCompanyId(orgId || null);

        // Load state from localStorage
        if (orgId && user.id) {
          const key = getStorageKey(orgId, user.id);
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              setState(JSON.parse(saved));
            } catch {
              setState(DEFAULT_STATE);
            }
          }
        }
      } catch (err) {
        console.warn("Error fetching company info for beta onboarding:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyInfo();
  }, [user?.id]);

  // Persist state to localStorage
  const persistState = useCallback((newState: BetaOnboardingState) => {
    if (companyId && user?.id) {
      const key = getStorageKey(companyId, user.id);
      localStorage.setItem(key, JSON.stringify(newState));
    }
    setState(newState);
  }, [companyId, user?.id]);

  // Dismiss welcome card
  const dismissWelcome = useCallback((skipped: boolean = false) => {
    const newState = { ...state, welcome_dismissed: true };
    persistState(newState);
    logBetaEvent(skipped ? "beta_onboarding_skipped" : "beta_onboarding_shown");
  }, [state, persistState, logBetaEvent]);

  // Reopen welcome (from settings/help)
  const reopenWelcome = useCallback(() => {
    const newState = { ...state, welcome_dismissed: false };
    persistState(newState);
  }, [state, persistState]);

  // Open checklist
  const openChecklist = useCallback(() => {
    const newState = { ...state, checklist_opened: true };
    persistState(newState);
    logBetaEvent("beta_checklist_opened");
  }, [state, persistState, logBetaEvent]);

  // Complete a checklist item
  const completeItem = useCallback((itemId: string) => {
    if (state.completed_items[itemId]) return;
    
    const newState = {
      ...state,
      completed_items: { ...state.completed_items, [itemId]: true },
    };
    persistState(newState);
    logBetaEvent("beta_checklist_item_completed", { item_id: itemId });
  }, [state, persistState, logBetaEvent]);

  // Check if all items are complete
  const checklistItems: ChecklistItem[] = useMemo(() => [
    {
      id: "select_laundromat",
      label: "Sélectionnez votre laverie",
      description: "Choisissez la laverie sur laquelle vous souhaitez travailler",
      link: "/dashboard",
      completed: state.completed_items["select_laundromat"] || false,
    },
    {
      id: "view_beta_rules",
      label: "Consultez les règles du programme bêta",
      description: "Découvrez les conditions et avantages du programme",
      link: "/beta",
      completed: state.completed_items["view_beta_rules"] || false,
    },
    {
      id: "confirm_details",
      label: "Confirmez les détails de votre laverie",
      description: "Vérifiez les paramètres de votre laverie active",
      link: "/laundromat-settings",
      completed: state.completed_items["confirm_details"] || false,
    },
    {
      id: "first_export",
      label: "Effectuez votre premier export",
      description: "Exportez vos données pour les sauvegarder ou les analyser",
      link: "/exports",
      completed: state.completed_items["first_export"] || false,
    },
    {
      id: "send_feedback",
      label: "Envoyez un premier feedback",
      description: "Aidez-nous à améliorer Lavcom avec vos retours",
      link: "/help",
      completed: state.completed_items["send_feedback"] || false,
    },
  ], [state.completed_items]);

  const completedCount = checklistItems.filter(item => item.completed).length;
  const isChecklistComplete = completedCount === checklistItems.length;
  const completionPercentage = Math.round((completedCount / checklistItems.length) * 100);

  // Show welcome only for beta companies, first time
  const shouldShowWelcome = isBeta && !state.welcome_dismissed && !isLoading && !isBetaLoading;

  return {
    // State
    isBeta,
    isLoading: isLoading || isBetaLoading,
    shouldShowWelcome,
    betaEndsAt,
    companyId,
    
    // Welcome actions
    dismissWelcome,
    reopenWelcome,
    
    // Checklist
    checklistItems,
    completedCount,
    isChecklistComplete,
    completionPercentage,
    openChecklist,
    completeItem,
    checklistOpened: state.checklist_opened,
  };
}
