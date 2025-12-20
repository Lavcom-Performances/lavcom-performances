import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { LaundryCosts } from '@/types/costs';

interface SiteCosts extends LaundryCosts {
  id: string;
  site_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const defaultCosts: LaundryCosts = {
  fixed_rent: 850,
  fixed_lease: 450,
  fixed_subscriptions: 120,
  fixed_insurance: 85,
  fixed_cleaning: 200,
  fixed_other: 50,
  var_energy_water_percent: 12,
  var_detergent_percent: 3,
};

export function useSiteCosts(siteId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: costs, isLoading } = useQuery({
    queryKey: ['site-costs', siteId],
    queryFn: async () => {
      if (!user || !siteId) return null;
      
      const { data, error } = await supabase
        .from('site_costs')
        .select('*')
        .eq('site_id', siteId)
        .maybeSingle();
      
      if (error) throw error;
      return data as SiteCosts | null;
    },
    enabled: !!user && !!siteId,
  });

  const upsertCosts = useMutation({
    mutationFn: async (input: LaundryCosts) => {
      if (!user || !siteId) throw new Error('User or site not available');
      
      const { data, error } = await supabase
        .from('site_costs')
        .upsert({
          site_id: siteId,
          user_id: user.id,
          fixed_rent: input.fixed_rent,
          fixed_lease: input.fixed_lease,
          fixed_subscriptions: input.fixed_subscriptions,
          fixed_insurance: input.fixed_insurance,
          fixed_cleaning: input.fixed_cleaning,
          fixed_other: input.fixed_other,
          var_energy_water_percent: input.var_energy_water_percent,
          var_detergent_percent: input.var_detergent_percent,
        }, {
          onConflict: 'site_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-costs'] });
    },
  });

  // Get costs with fallback to defaults
  const getCosts = (): LaundryCosts => {
    if (!costs) return defaultCosts;
    return {
      fixed_rent: costs.fixed_rent ?? defaultCosts.fixed_rent,
      fixed_lease: costs.fixed_lease ?? defaultCosts.fixed_lease,
      fixed_subscriptions: costs.fixed_subscriptions ?? defaultCosts.fixed_subscriptions,
      fixed_insurance: costs.fixed_insurance ?? defaultCosts.fixed_insurance,
      fixed_cleaning: costs.fixed_cleaning ?? defaultCosts.fixed_cleaning,
      fixed_other: costs.fixed_other ?? defaultCosts.fixed_other,
      var_energy_water_percent: costs.var_energy_water_percent ?? defaultCosts.var_energy_water_percent,
      var_detergent_percent: costs.var_detergent_percent ?? defaultCosts.var_detergent_percent,
    };
  };

  return {
    costs: getCosts(),
    isLoading,
    upsertCosts,
    hasCosts: !!costs,
  };
}

// Hook to get costs for multiple sites (for comparison)
export function useMultipleSitesCosts(siteIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['site-costs-multiple', siteIds],
    queryFn: async () => {
      if (!user || siteIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('site_costs')
        .select('*')
        .in('site_id', siteIds);
      
      if (error) throw error;
      
      // Map by site_id
      const costsMap: Record<string, LaundryCosts> = {};
      for (const cost of (data || [])) {
        costsMap[cost.site_id] = {
          fixed_rent: cost.fixed_rent ?? defaultCosts.fixed_rent,
          fixed_lease: cost.fixed_lease ?? defaultCosts.fixed_lease,
          fixed_subscriptions: cost.fixed_subscriptions ?? defaultCosts.fixed_subscriptions,
          fixed_insurance: cost.fixed_insurance ?? defaultCosts.fixed_insurance,
          fixed_cleaning: cost.fixed_cleaning ?? defaultCosts.fixed_cleaning,
          fixed_other: cost.fixed_other ?? defaultCosts.fixed_other,
          var_energy_water_percent: cost.var_energy_water_percent ?? defaultCosts.var_energy_water_percent,
          var_detergent_percent: cost.var_detergent_percent ?? defaultCosts.var_detergent_percent,
        };
      }
      
      return costsMap;
    },
    enabled: !!user && siteIds.length > 0,
  });
}
