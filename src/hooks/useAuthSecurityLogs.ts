/**
 * Hook to fetch auth-related security events from system_events
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuthSecurityLog {
  id: number;
  created_at: string;
  severity: string;
  code: string | null;
  message: string;
  env: string;
  meta: {
    flow?: string;
    reason?: string;
    timestamp?: string;
    [key: string]: unknown;
  } | null;
}

interface UseAuthSecurityLogsOptions {
  limit?: number;
  source?: string;
}

export function useAuthSecurityLogs(options: UseAuthSecurityLogsOptions = {}) {
  const { limit = 50, source = 'auth_password_policy' } = options;
  
  const [logs, setLogs] = useState<AuthSecurityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('system_events')
        .select('*')
        .eq('source', source)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      
      setLogs((data as AuthSecurityLog[]) || []);
    } catch (err) {
      console.error('[useAuthSecurityLogs] Error fetching logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  }, [limit, source]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    isLoading,
    error,
    refetch: fetchLogs,
  };
}
