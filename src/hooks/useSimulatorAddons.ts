import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function useSimulatorAddons() {
  const { t } = useTranslation(['app', 'common', 'errors']);
  const [isLoading, setIsLoading] = useState(false);

  const purchaseAddon = async (addonKind: string, tier: string) => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error(t('errors:auth.notAuthenticated'));
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-addon-checkout", {
        body: { addon_kind: addonKind, tier },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error("Addon checkout error:", error);
        toast.error(error.message || t('errors:payment.checkoutFailed'));
        return;
      }

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Addon checkout exception:", err);
      toast.error(t('errors:payment.checkoutFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return { purchaseAddon, isLoading };
}
