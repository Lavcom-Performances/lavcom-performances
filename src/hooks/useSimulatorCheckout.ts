import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function useSimulatorCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation(['app', 'errors']);

  const checkout = async (packId: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-simulator-checkout', {
        body: { packId },
      });

      if (error) {
        console.error("Checkout error:", error);
        toast.error(t('errors:payment.checkoutFailed'));
        return;
      }

      if (data?.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank');
      } else {
        toast.error(t('errors:payment.noSessionUrl'));
      }
    } catch (err) {
      console.error("Checkout exception:", err);
      toast.error(t('errors:payment.unexpected'));
    } finally {
      setIsLoading(false);
    }
  };

  return { checkout, isLoading };
}
