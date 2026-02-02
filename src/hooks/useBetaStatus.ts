import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface BetaStatus {
  is_beta: boolean;
  beta_started_at?: string;
  beta_ends_at?: string;
  beta_price_cents?: number;
  standard_price_cents?: number;
  effective_price_cents: number;
  days_remaining?: number;
}

interface UseBetaStatusResult {
  betaStatus: BetaStatus | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBetaStatus(organizationId: string | null): UseBetaStatusResult {
  const { user } = useAuth();
  const [betaStatus, setBetaStatus] = useState<BetaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBetaStatus = useCallback(async () => {
    if (!organizationId || !user) {
      setBetaStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc("rpc_get_company_beta_status", {
        p_organization_id: organizationId,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setBetaStatus(data as unknown as BetaStatus);
    } catch (err) {
      console.error("Error fetching beta status:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch beta status");
      setBetaStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, user]);

  useEffect(() => {
    fetchBetaStatus();
  }, [fetchBetaStatus]);

  return {
    betaStatus,
    isLoading,
    error,
    refresh: fetchBetaStatus,
  };
}
