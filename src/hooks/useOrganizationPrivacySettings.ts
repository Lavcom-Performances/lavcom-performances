import { useState, useEffect, useCallback } from "react";
import {
  getOrganizationPrivacySettings,
  upsertOrganizationPrivacySettings,
  OrganizationPrivacySettings,
} from "@/lib/organizationPrivacySettings";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "@/hooks/use-toast";

export function useOrganizationPrivacySettings() {
  const { user } = useAuth();
  const { organization, isAdmin, isSuperAdmin, isCompanyAdmin } = useOrganization();
  
  const [settings, setSettings] = useState<OrganizationPrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = isAdmin || isSuperAdmin || isCompanyAdmin || 
    (organization && user && organization.owner_id === user.id);

  const fetchSettings = useCallback(async () => {
    if (!organization?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getOrganizationPrivacySettings(organization.id);
      setSettings(data);
    } catch (err) {
      console.error("Failed to fetch privacy settings:", err);
      setError("Impossible de charger les paramètres de confidentialité");
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (allowAnonymousSiteData: boolean) => {
      if (!organization?.id || !user?.id) {
        toast({
          title: "Erreur",
          description: "Organisation ou utilisateur non disponible",
          variant: "destructive",
        });
        return false;
      }

      if (!canManage) {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les droits pour modifier ces paramètres",
          variant: "destructive",
        });
        return false;
      }

      try {
        setIsSaving(true);
        setError(null);
        const updated = await upsertOrganizationPrivacySettings({
          organizationId: organization.id,
          allowAnonymousSiteData,
          decidedByUserId: user.id,
        });
        setSettings(updated);
        toast({
          title: "Paramètres mis à jour",
          description: "Vos préférences de confidentialité ont été enregistrées.",
        });
        return true;
      } catch (err) {
        console.error("Failed to update privacy settings:", err);
        setError("Impossible de sauvegarder les paramètres");
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder les paramètres de confidentialité",
          variant: "destructive",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [organization?.id, user?.id, canManage]
  );

  return {
    settings,
    isLoading,
    isSaving,
    error,
    canManage,
    allowAnonymousSiteData: settings?.allow_anonymous_site_data ?? false,
    updateSettings,
    refetch: fetchSettings,
  };
}
