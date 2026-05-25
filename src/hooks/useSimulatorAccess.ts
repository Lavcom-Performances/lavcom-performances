import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getTierFromPlanCode } from "@/config/pricingConfig";

const SIMULATOR_BYPASS_EMAILS = new Set([
  "yohana@lavcom.fr",
  "yoann.misericordia@laposte.net",
  "illies.kaleche@hotmail.fr",
  "rnaranjoromero@gmail.com",
  "contact@lavcom.fr",
]);

interface SimulatorAccess {
  hasAccess: boolean;
  accessExpiresAt: Date | null;
  maxProjects: number;
  planCode: string | null;
  tier: string;
  daysRemaining: number | null;
  isExpiringSoon: boolean; // J-7 or less
  projectsUsed: number; // Will need to be fetched from simulation_projects table
}

export function useSimulatorAccess() {
  const { user } = useAuth();
  const [access, setAccess] = useState<SimulatorAccess | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccess = useCallback(async () => {
    if (!user) {
      setAccess(null);
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("access_expires_at, max_projects, plan_code")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching simulator access:", error);
        setLoading(false);
        return;
      }

      const now = new Date();
      const expiresAt = profile?.access_expires_at 
        ? new Date(profile.access_expires_at) 
        : null;

      const isBypassed = !!user.email && SIMULATOR_BYPASS_EMAILS.has(user.email.toLowerCase().trim());
      const hasAccess = isBypassed || (expiresAt ? expiresAt > now : false);
      const maxProjects = isBypassed ? 999 : (profile?.max_projects || 0);
      const planCode = isBypassed ? (profile?.plan_code || "bypass") : (profile?.plan_code || null);
      const tier = isBypassed ? "premium" : getTierFromPlanCode(planCode);

      let daysRemaining: number | null = null;
      if (expiresAt && hasAccess) {
        daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

      // TODO: Fetch actual projects used count from a simulation_projects table
      // For now, we'll estimate it as 0
      const projectsUsed = 0;

      setAccess({
        hasAccess,
        accessExpiresAt: expiresAt,
        maxProjects,
        planCode,
        tier,
        daysRemaining,
        isExpiringSoon,
        projectsUsed,
      });
    } catch (err) {
      console.error("Exception fetching simulator access:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  return { 
    access, 
    loading, 
    refetch: fetchAccess,
    hasAccess: access?.hasAccess || false,
    isExpiringSoon: access?.isExpiringSoon || false,
    daysRemaining: access?.daysRemaining,
    tier: access?.tier || "essential",
    maxProjects: access?.maxProjects || 0,
    projectsUsed: access?.projectsUsed || 0,
    isProjectLimitReached: access ? access.projectsUsed >= access.maxProjects : false,
  };
}
