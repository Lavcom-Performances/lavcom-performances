import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  generateDemoOperations,
  DEMO_SITE_NAME,
  DEMO_SITE_ADDRESS,
  DEMO_SITE_CITY,
  DEMO_SITE_POSTAL_CODE,
} from "@/utils/demoDataGenerator";

export function useDemoMode() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [isDeletingDemo, setIsDeletingDemo] = useState(false);

  const createDemoSite = useCallback(async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour voir l'exemple.",
        variant: "destructive",
      });
      return null;
    }

    setIsCreatingDemo(true);

    try {
      // Check if demo site already exists for this user
      const { data: existingDemo } = await supabase
        .from("sites")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_demo", true)
        .maybeSingle();

      if (existingDemo) {
        // Demo already exists, just navigate to it
        localStorage.setItem("selectedSiteId", existingDemo.id);
        navigate(`/dashboard`);
        return existingDemo.id;
      }

      // Create demo site
      const { data: newSite, error: siteError } = await supabase
        .from("sites")
        .insert({
          user_id: user.id,
          name: DEMO_SITE_NAME,
          address: DEMO_SITE_ADDRESS,
          city: DEMO_SITE_CITY,
          postal_code: DEMO_SITE_POSTAL_CODE,
          is_demo: true,
          is_default: false,
        })
        .select()
        .single();

      if (siteError) throw siteError;

      // Create demo import batch
      const { data: batch, error: batchError } = await supabase
        .from("import_batches")
        .insert({
          user_id: user.id,
          site_id: newSite.id,
          filename: "demo-data.csv",
          total_rows: 0,
          imported_rows: 0,
          ignored_rows: 0,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Generate demo operations
      const demoOperations = generateDemoOperations(6);

      // Insert operations in batches of 500
      const BATCH_SIZE = 500;
      let totalInserted = 0;

      for (let i = 0; i < demoOperations.length; i += BATCH_SIZE) {
        const chunk = demoOperations.slice(i, i + BATCH_SIZE).map((op) => ({
          user_id: user.id,
          site_id: newSite.id,
          import_batch_id: batch.id,
          operation_date: op.operation_date,
          operation_time: op.operation_time,
          amount: op.amount,
          machine: op.machine,
          program: op.program,
          payment_mode: op.payment_mode,
        }));

        const { error: opsError } = await supabase
          .from("operations")
          .insert(chunk);

        if (opsError) throw opsError;
        totalInserted += chunk.length;
      }

      // Update batch counts
      await supabase
        .from("import_batches")
        .update({
          total_rows: totalInserted,
          imported_rows: totalInserted,
        })
        .eq("id", batch.id);

      toast({
        title: "Données d'exemple créées",
        description: `${totalInserted.toLocaleString()} opérations sur 6 mois`,
      });

      // Navigate to dashboard with demo site
      localStorage.setItem("selectedSiteId", newSite.id);
      navigate(`/dashboard`);

      return newSite.id;
    } catch (error) {
      console.error("Error creating demo:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer les données d'exemple.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCreatingDemo(false);
    }
  }, [user, navigate]);

  const deleteDemoSite = useCallback(async () => {
    if (!user) return false;

    setIsDeletingDemo(true);

    try {
      // Find demo site
      const { data: demoSite } = await supabase
        .from("sites")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_demo", true)
        .maybeSingle();

      if (!demoSite) {
        toast({
          title: "Aucune démo",
          description: "Aucune donnée d'exemple à supprimer.",
        });
        return false;
      }

      // Delete operations first (cascade would work but let's be explicit)
      await supabase
        .from("operations")
        .delete()
        .eq("site_id", demoSite.id);

      // Delete import batches
      await supabase
        .from("import_batches")
        .delete()
        .eq("site_id", demoSite.id);

      // Delete site costs if any
      await supabase
        .from("site_costs")
        .delete()
        .eq("site_id", demoSite.id);

      // Delete user goals if any
      await supabase
        .from("user_goals")
        .delete()
        .eq("site_id", demoSite.id);

      // Delete the demo site
      const { error: deleteError } = await supabase
        .from("sites")
        .delete()
        .eq("id", demoSite.id);

      if (deleteError) throw deleteError;

      // Clear localStorage if demo was selected
      const selectedSiteId = localStorage.getItem("selectedSiteId");
      if (selectedSiteId === demoSite.id) {
        localStorage.removeItem("selectedSiteId");
      }

      toast({
        title: "Démo supprimée",
        description: "Les données d'exemple ont été supprimées.",
      });

      navigate("/select-laundromat");
      return true;
    } catch (error) {
      console.error("Error deleting demo:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les données d'exemple.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeletingDemo(false);
    }
  }, [user, navigate]);

  return {
    createDemoSite,
    deleteDemoSite,
    isCreatingDemo,
    isDeletingDemo,
  };
}
