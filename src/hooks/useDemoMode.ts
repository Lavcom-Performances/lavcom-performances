import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export function useDemoMode() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [isDeletingDemo, setIsDeletingDemo] = useState(false);

  const createDemoSite = useCallback(async () => {
    if (!user || !session) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour voir l'exemple.",
        variant: "destructive",
      });
      return null;
    }

    setIsCreatingDemo(true);

    try {
      // Call edge function to create demo (much faster server-side)
      const { data, error } = await supabase.functions.invoke("create-demo", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (!data.siteId) {
        throw new Error("No site ID returned");
      }

      if (data.created) {
        toast({
          title: "Données d'exemple créées",
          description: `${data.operationsCount?.toLocaleString() || "~3000"} opérations sur 6 mois`,
        });
      }

      // Navigate to dashboard with demo site
      localStorage.setItem("selectedSiteId", data.siteId);
      navigate(`/dashboard`);

      return data.siteId;
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
  }, [user, session, navigate]);

  const deleteDemoSite = useCallback(async () => {
    if (!user) return false;

    setIsDeletingDemo(true);

    try {
      // Find demo site
      const { data: demoSite } = await supabase
        .from("sites")
        .select("id, name")
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

      // Delete operations first
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

      // Log deletion to system_events for audit trail
      await supabase.rpc("rpc_log_system_event", {
        p_source: "site_delete",
        p_severity: "info",
        p_code: "DEMO_SITE_DELETED",
        p_message: `Demo site deleted by user`,
        p_env: import.meta.env.MODE || "production",
        p_meta: {
          site_id: demoSite.id,
          site_name: demoSite.name,
          user_id: user.id,
          user_email: user.email,
          action: "delete_demo_site",
        },
      });

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
