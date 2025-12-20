import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ImportBatch {
  id: string;
  filename: string;
  total_rows: number;
  imported_rows: number;
  ignored_rows: number;
  site_id: string;
  created_at: string;
  site_name?: string;
}

export function useImportBatches() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    if (!user) {
      setBatches([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch batches with site info
      const { data: batchesData, error: fetchError } = await supabase
        .from("import_batches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch site names
      const { data: sitesData } = await supabase
        .from("sites")
        .select("id, name")
        .eq("user_id", user.id);

      const sitesMap = new Map(sitesData?.map(s => [s.id, s.name]) || []);

      const batchesWithSites: ImportBatch[] = (batchesData || []).map(b => ({
        ...b,
        site_name: sitesMap.get(b.site_id) || "Laverie inconnue",
      }));

      setBatches(batchesWithSites);
    } catch (err) {
      console.error("Error fetching import batches:", err);
      setError("Impossible de charger l'historique des imports");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const deleteBatch = useCallback(async (batchId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from("import_batches")
        .delete()
        .eq("id", batchId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      // Update local state
      setBatches(prev => prev.filter(b => b.id !== batchId));
      return true;
    } catch (err) {
      console.error("Error deleting import batch:", err);
      throw err;
    }
  }, [user]);

  return {
    batches,
    isLoading,
    error,
    refetch: fetchBatches,
    deleteBatch,
  };
}
