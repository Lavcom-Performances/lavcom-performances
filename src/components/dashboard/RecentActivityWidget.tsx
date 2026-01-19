/**
 * Dashboard widget showing recent audit log activity for the current user
 * Includes real-time updates via Supabase subscriptions
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, Filter, RefreshCw, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import type { Json } from '@/integrations/supabase/types';

interface AuditLogEntry {
  id: string;
  created_at: string;
  action: string;
  target_table: string;
  target_id: string | null;
  metadata: Json | null;
}

type ActionFilter = 'all' | 'INSERT' | 'UPDATE' | 'DELETE' | 'EXPORT';

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  EXPORT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  SELECT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const TABLE_LABELS: Record<string, string> = {
  sites: 'Laverie',
  profiles: 'Profil',
  user_permissions: 'Permissions',
  operations: 'Opérations',
  organizations: 'Organisation',
  subscriptions: 'Abonnement',
  import_batches: 'Import',
  site_costs: 'Coûts',
  notification_preferences: 'Notifications',
  auth: 'Authentification',
};

interface RecentActivityWidgetProps {
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
}

export function RecentActivityWidget({ 
  limit = 10, 
  showFilters = true,
  compact = false 
}: RecentActivityWidgetProps) {
  const { t } = useTranslation('app');
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('id, created_at, action, target_table, target_id, metadata')
        .eq('actor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[RecentActivityWidget] Error fetching logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.error('[RecentActivityWidget] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, limit, actionFilter]);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time subscription for new audit logs
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-activity-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `actor_id=eq.${user.id}`,
        },
        (payload) => {
          const newLog = payload.new as AuditLogEntry;
          
          // Check if this log matches the current filter
          if (actionFilter !== 'all' && newLog.action !== actionFilter) {
            return;
          }

          // Add new log to the top of the list
          setLogs((prev) => {
            // Avoid duplicates
            if (prev.some((log) => log.id === newLog.id)) {
              return prev;
            }
            // Keep only the most recent logs up to the limit
            return [newLog, ...prev].slice(0, limit);
          });
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('[RecentActivityWidget] Realtime connected');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, actionFilter, limit]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return format(date, 'dd MMM yyyy', { locale: fr });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      INSERT: 'Création',
      UPDATE: 'Modification',
      DELETE: 'Suppression',
      EXPORT: 'Export',
      SELECT: 'Consultation',
    };
    return labels[action] || action;
  };

  const getActivityDescription = (log: AuditLogEntry) => {
    const tableLabel = TABLE_LABELS[log.target_table] || log.target_table;
    const actionLabel = getActionLabel(log.action).toLowerCase();
    
    // Try to get a more specific description from metadata
    const meta = log.metadata;
    if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
      const metaObj = meta as Record<string, unknown>;
      if (metaObj.site_name) return `${actionLabel} de "${metaObj.site_name}"`;
      if (metaObj.changed_fields && Array.isArray(metaObj.changed_fields)) {
        return `${actionLabel} (${(metaObj.changed_fields as string[]).join(', ')})`;
      }
      if (metaObj.permission_changed) return `${actionLabel} de ${metaObj.permission_changed}`;
    }
    
    return `${actionLabel} - ${tableLabel}`;
  };

  if (!user) return null;

  return (
    <Card className={compact ? 'border-0 shadow-none' : ''}>
      <CardHeader className={compact ? 'pb-2 px-0' : 'pb-2'}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Activité récente
            {isRealtimeConnected && (
              <span title="Temps réel actif">
                <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {showFilters && (
              <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as ActionFilter)}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tout</SelectItem>
                  <SelectItem value="INSERT">Créations</SelectItem>
                  <SelectItem value="UPDATE">Modifications</SelectItem>
                  <SelectItem value="DELETE">Suppressions</SelectItem>
                  <SelectItem value="EXPORT">Exports</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchLogs}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'px-0' : ''}>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune activité récente</p>
          </div>
        ) : (
          <ScrollArea className={compact ? 'h-[200px]' : 'h-[300px]'}>
            <div className="space-y-2">
              {logs.map((log) => (
                <Collapsible
                  key={log.id}
                  open={expandedLog === log.id}
                  onOpenChange={(open) => setExpandedLog(open ? log.id : null)}
                >
                  <div className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Badge
                      variant="secondary"
                      className={`text-xs font-medium ${ACTION_COLORS[log.action] || ''}`}
                    >
                      {getActionLabel(log.action)}
                    </Badge>
                    <span className="flex-1 text-sm truncate">
                      {getActivityDescription(log)}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(log.created_at)}
                    </span>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedLog === log.id ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <CollapsibleContent>
                      <div className="ml-4 mt-1 mb-2 p-2 bg-muted/30 rounded text-xs font-mono overflow-x-auto">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
