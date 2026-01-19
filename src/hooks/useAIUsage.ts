import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AIUsageData {
  actor_id: string;
  date: string;
  request_count: number;
  tokens_in: number;
  tokens_out: number;
  estimated_cost_eur: number;
}

interface AIUsageLimits {
  daily_request_limit: number;
  daily_cost_limit_eur: number;
}

const DEFAULT_LIMITS: AIUsageLimits = {
  daily_request_limit: 200,
  daily_cost_limit_eur: 5,
};

export function useAIUsage() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-usage-today', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.rpc('rpc_get_ai_usage_today', {
        p_actor_id: user.id,
      });
      
      if (error) throw error;
      return data as unknown as AIUsageData | null;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  const usage = data ?? {
    date: new Date().toISOString().split('T')[0],
    request_count: 0,
    tokens_in: 0,
    tokens_out: 0,
    estimated_cost_eur: 0,
  };

  return {
    usage,
    limits: DEFAULT_LIMITS,
    remainingRequests: Math.max(0, DEFAULT_LIMITS.daily_request_limit - usage.request_count),
    remainingCost: Math.max(0, DEFAULT_LIMITS.daily_cost_limit_eur - usage.estimated_cost_eur),
    requestPercentage: Math.min(100, (usage.request_count / DEFAULT_LIMITS.daily_request_limit) * 100),
    costPercentage: Math.min(100, (usage.estimated_cost_eur / DEFAULT_LIMITS.daily_cost_limit_eur) * 100),
    isLoading,
    error,
    refetch,
  };
}

// Admin hook to get all users' AI usage
export function useAdminAIUsage(dateRange?: { start: string; end: string }) {
  const today = new Date().toISOString().split('T')[0];
  const startDate = dateRange?.start ?? today;
  const endDate = dateRange?.end ?? today;

  return useQuery({
    queryKey: ['admin-ai-usage', startDate, endDate],
    queryFn: async () => {
      // Get all usage data for the date range
      const { data, error } = await supabase
        .from('ai_usage_daily')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .order('request_count', { ascending: false });
      
      if (error) throw error;
      return data as AIUsageData[];
    },
    staleTime: 60 * 1000,
  });
}

// Get rate limit events from system_events
export function useAIRateLimitEvents(limit = 50) {
  return useQuery({
    queryKey: ['ai-rate-limit-events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .eq('source', 'ai_proxy')
        .in('code', ['RATE_LIMITED', 'QUOTA_EXCEEDED', 'BURST_LIMIT'])
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });
}
