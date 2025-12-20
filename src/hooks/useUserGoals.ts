import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserGoals {
  id: string;
  user_id: string;
  site_id: string | null;
  monthly_revenue_goal: number;
  annual_revenue_goal: number;
  monthly_transactions_goal: number;
  created_at: string;
  updated_at: string;
}

interface GoalsInput {
  monthly_revenue_goal: number;
  annual_revenue_goal: number;
  monthly_transactions_goal: number;
  site_id?: string | null;
}

export function useUserGoals(siteId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: goals, isLoading } = useQuery({
    queryKey: ['user-goals', user?.id, siteId],
    queryFn: async () => {
      if (!user) return null;
      
      let query = supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id);
      
      if (siteId) {
        query = query.eq('site_id', siteId);
      } else {
        query = query.is('site_id', null);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      return data as UserGoals | null;
    },
    enabled: !!user,
  });

  const upsertGoals = useMutation({
    mutationFn: async (input: GoalsInput) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_goals')
        .upsert({
          user_id: user.id,
          site_id: input.site_id ?? null,
          monthly_revenue_goal: input.monthly_revenue_goal,
          annual_revenue_goal: input.annual_revenue_goal,
          monthly_transactions_goal: input.monthly_transactions_goal,
        }, {
          onConflict: 'user_id,site_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-goals'] });
    },
  });

  // Default values if no goals are set
  const defaultGoals = {
    monthly_revenue_goal: 5000,
    annual_revenue_goal: 60000,
    monthly_transactions_goal: 500,
  };

  return {
    goals: goals ?? defaultGoals,
    isLoading,
    upsertGoals,
  };
}
