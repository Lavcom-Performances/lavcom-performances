/**
 * useDuplicateCheck hook
 * 
 * Checks for potential duplicate sites during site creation
 * TAEX-236
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logDuplicateEvent } from "@/lib/duplicateLogger";
import type { DuplicateSite } from "@/components/laundromat/DuplicateWarningDialog";

interface UseDuplicateCheckResult {
  checkDuplicates: (params: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
  }) => Promise<DuplicateSite[]>;
  isChecking: boolean;
}

export function useDuplicateCheck(): UseDuplicateCheckResult {
  const [isChecking, setIsChecking] = useState(false);

  const checkDuplicates = useCallback(async ({
    name,
    address,
    postalCode,
    city,
    country,
  }: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
  }): Promise<DuplicateSite[]> => {
    // Skip check if postal code is missing (required for duplicate detection)
    if (!postalCode || postalCode.length < 3) {
      return [];
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.rpc('check_duplicate_sites', {
        p_name: name,
        p_address: address,
        p_postal_code: postalCode,
        p_city: city,
        p_country: country,
      });

      if (error) {
        console.error('[useDuplicateCheck] Error checking duplicates:', error);
        return [];
      }

      const duplicates = (data || []) as DuplicateSite[];
      
      // Log if duplicates found
      if (duplicates.length > 0) {
        logDuplicateEvent('DUPLICATE_WARNING_SHOWN', {
          postal_code: postalCode,
          city: city,
          country: country,
          match_count: duplicates.length,
        });
      }

      return duplicates;
    } catch (error) {
      console.error('[useDuplicateCheck] Unexpected error:', error);
      return [];
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkDuplicates,
    isChecking,
  };
}
