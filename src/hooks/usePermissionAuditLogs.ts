import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PermissionAuditLog {
  id: string;
  performed_by: string;
  target_user_id: string;
  organization_id: string;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined data
  performer_email?: string;
  target_email?: string;
}

type RawAuditLog = {
  id: string;
  performed_by: string;
  target_user_id: string;
  organization_id: string;
  action: string;
  old_values: unknown;
  new_values: unknown;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
};

export function usePermissionAuditLogs(organizationId: string | null) {
  const [logs, setLogs] = useState<PermissionAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('permission_audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching permission audit logs:', error);
        return;
      }

      // Fetch user emails for display
      const userIds = new Set<string>();
      data?.forEach(log => {
        userIds.add(log.performed_by);
        userIds.add(log.target_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', Array.from(userIds));

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      const logsWithEmails: PermissionAuditLog[] = (data as RawAuditLog[])?.map(log => ({
        ...log,
        old_values: log.old_values as Record<string, unknown> | null,
        new_values: log.new_values as Record<string, unknown> | null,
        performer_email: emailMap.get(log.performed_by) || 'Utilisateur inconnu',
        target_email: emailMap.get(log.target_user_id) || 'Utilisateur inconnu',
      })) || [];

      setLogs(logsWithEmails);
    } catch (error) {
      console.error('Error in fetchLogs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logPermissionChange = async (
    targetUserId: string,
    action: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null
  ) => {
    if (!organizationId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const insertData = {
        performed_by: user.id,
        target_user_id: targetUserId,
        organization_id: organizationId,
        action,
        old_values: oldValues,
        new_values: newValues,
        user_agent: navigator.userAgent,
      };

      await supabase
        .from('permission_audit_logs')
        .insert(insertData as any);

      // Refresh logs
      fetchLogs();

      // Send email notification to super admins for sensitive actions
      const sensitiveActions = ['role_changed', 'all_permissions_granted', 'all_permissions_revoked', 'can_manage_roles', 'can_manage_billing'];
      const isSensitive = sensitiveActions.includes(action) || 
        (newValues && ('can_manage_roles' in newValues || 'can_manage_billing' in newValues));

      if (isSensitive) {
        // Get performer and target emails
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', [user.id, targetUserId]);

        const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
        const performerEmail = emailMap.get(user.id) || 'Utilisateur inconnu';
        const targetEmail = emailMap.get(targetUserId) || 'Utilisateur inconnu';

        // Send notification via edge function (fire and forget)
        supabase.functions.invoke('send-permission-alert', {
          body: {
            organizationId,
            action,
            performerEmail,
            targetEmail,
            oldValues,
            newValues,
          },
        }).catch(err => {
          console.error('Failed to send permission alert:', err);
        });
      }
    } catch (error) {
      console.error('Error logging permission change:', error);
    }
  };

  return {
    logs,
    isLoading,
    refresh: fetchLogs,
    logPermissionChange,
  };
}
