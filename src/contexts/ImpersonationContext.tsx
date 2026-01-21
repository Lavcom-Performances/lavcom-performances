import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformRole } from '@/hooks/usePlatformRole';

interface ImpersonationSession {
  id: string;
  target_user_id: string;
  target_email: string;
  target_name: string | null;
  target_company: string | null;
  reason: string;
  ticket_id: string | null;
  created_at: string;
  expires_at: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  session: ImpersonationSession | null;
  loading: boolean;
  startImpersonation: (targetUserId: string, reason: string, ticketId?: string) => Promise<{ success: boolean; error?: string }>;
  endImpersonation: (reason?: string) => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { role } = usePlatformRole();
  const [session, setSession] = useState<ImpersonationSession | null>(null);
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = role === 'super_admin';

  const refreshSession = useCallback(async () => {
    if (!user || !isSuperAdmin) {
      setSession(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-impersonation-session');
      
      if (error) {
        console.error('[ImpersonationContext] Error fetching session:', error);
        return;
      }

      if (data.active && data.session) {
        setSession(data.session);
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('[ImpersonationContext] Error:', err);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (user && isSuperAdmin) {
      refreshSession();
    } else {
      setSession(null);
    }
  }, [user, isSuperAdmin, refreshSession]);

  // Auto-expire check
  useEffect(() => {
    if (!session) return;

    const expiresAt = new Date(session.expires_at).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry <= 0) {
      setSession(null);
      return;
    }

    const timer = setTimeout(() => {
      setSession(null);
    }, timeUntilExpiry);

    return () => clearTimeout(timer);
  }, [session]);

  const startImpersonation = useCallback(async (
    targetUserId: string, 
    reason: string, 
    ticketId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperAdmin) {
      return { success: false, error: 'Only super_admin can impersonate users' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-impersonation', {
        body: { target_user_id: targetUserId, reason, ticket_id: ticketId },
      });

      if (error) {
        console.error('[ImpersonationContext] Start error:', error);
        return { success: false, error: error.message || 'Failed to start impersonation' };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      await refreshSession();
      return { success: true };
    } catch (err) {
      console.error('[ImpersonationContext] Start exception:', err);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, refreshSession]);

  const endImpersonation = useCallback(async (reason?: string): Promise<{ success: boolean; error?: string }> => {
    if (!session) {
      return { success: false, error: 'No active impersonation session' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('end-impersonation', {
        body: { session_id: session.id, reason },
      });

      if (error) {
        console.error('[ImpersonationContext] End error:', error);
        return { success: false, error: error.message || 'Failed to end impersonation' };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      setSession(null);
      return { success: true };
    } catch (err) {
      console.error('[ImpersonationContext] End exception:', err);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  }, [session]);

  return (
    <ImpersonationContext.Provider value={{
      isImpersonating: !!session,
      session,
      loading,
      startImpersonation,
      endImpersonation,
      refreshSession,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
