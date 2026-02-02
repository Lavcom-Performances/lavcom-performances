import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseLaundromatStatusOptions {
  onSuccess?: () => void;
}

export function useLaundromatStatus(options?: UseLaundromatStatusOptions) {
  const [isClosing, setIsClosing] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  const closeLaundromat = async (laundromatId: string, reason?: string): Promise<boolean> => {
    setIsClosing(true);
    try {
      const { data, error } = await supabase.functions.invoke('close-laundromat', {
        body: { laundromat_id: laundromatId, reason },
      });

      if (error) {
        console.error('Error closing laundromat:', error);
        toast.error('Erreur lors de la fermeture de la laverie');
        return false;
      }

      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      toast.success('Laverie fermée avec succès');
      options?.onSuccess?.();
      return true;
    } catch (error) {
      console.error('Error closing laundromat:', error);
      toast.error('Erreur lors de la fermeture de la laverie');
      return false;
    } finally {
      setIsClosing(false);
    }
  };

  const reactivateLaundromat = async (laundromatId: string): Promise<boolean> => {
    setIsReactivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('reactivate-laundromat', {
        body: { laundromat_id: laundromatId },
      });

      if (error) {
        console.error('Error reactivating laundromat:', error);
        toast.error('Erreur lors de la réactivation de la laverie');
        return false;
      }

      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      toast.success('Laverie réactivée avec succès');
      options?.onSuccess?.();
      return true;
    } catch (error) {
      console.error('Error reactivating laundromat:', error);
      toast.error('Erreur lors de la réactivation de la laverie');
      return false;
    } finally {
      setIsReactivating(false);
    }
  };

  return {
    closeLaundromat,
    reactivateLaundromat,
    isClosing,
    isReactivating,
    isProcessing: isClosing || isReactivating,
  };
}

/**
 * Hook to check if a laundromat is closed
 */
export function useIsLaundromatClosed(status?: string): boolean {
  return status === 'closed';
}
