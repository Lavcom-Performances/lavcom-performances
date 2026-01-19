/**
 * Organization-wide activity feed showing all team members' actions for admins
 */
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Activity, 
  Filter, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Users,
  User,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import type { Json } from '@/integrations/supabase/types';

interface OrgAuditLogEntry {
  id: string;
  created_at: string;
  action: string;
  target_table: string;
  target_id: string | null;
  metadata: Json | null;
  actor_id: string | null;
  actor_email?: string;
  actor_name?: string;
}

type ActionFilter = 'all' | 'INSERT' | 'UPDATE' | 'DELETE' | 'EXPORT';
type TableFilter = 'all' | 'sites' | 'profiles' | 'user_permissions' | 'operations' | 'organizations';

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  EXPORT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  SELECT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const TABLE_LABELS: Record<string, string> = {
  sites: 'Laveries',
  profiles: 'Profils',
  user_permissions: 'Permissions',
  operations: 'Opérations',
  organizations: 'Organisation',
  subscriptions: 'Abonnements',
  import_batches: 'Imports',
  site_costs: 'Coûts',
  notification_preferences: 'Notifications',
  auth: 'Authentification',
  user_roles: 'Rôles',
};

interface OrgActivityFeedProps {
  organizationId?: string;
  limit?: number;
}

export function OrgActivityFeed({ 
  organizationId,
  limit = 25 
}: OrgActivityFeedProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<OrgAuditLogEntry[]>([]);
  const [profiles, setProfiles] = useState<Map<string, { email: string; first_name?: string; last_name?: string }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [tableFilter, setTableFilter] = useState<TableFilter>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchOrgMembers = useCallback(async () => {
    if (!organizationId) return;

    try {
      // Get all user IDs from the organization
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('organization_id', organizationId);

      if (!roles || roles.length === 0) return;

      const userIds = roles.map(r => r.user_id);

      // Get profiles for these users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (profilesData) {
        const profileMap = new Map();
        profilesData.forEach(p => {
          profileMap.set(p.id, {
            email: p.email,
            first_name: p.first_name,
            last_name: p.last_name
          });
        });
        setProfiles(profileMap);
      }
    } catch (err) {
      console.error('[OrgActivityFeed] Error fetching members:', err);
    }
  }, [organizationId]);

  const fetchLogs = useCallback(async (pageNum: number = 0) => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      // Get all user IDs from the organization
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('organization_id', organizationId);

      if (!roles || roles.length === 0) {
        setLogs([]);
        setIsLoading(false);
        return;
      }

      const userIds = roles.map(r => r.user_id);

      let query = supabase
        .from('audit_logs')
        .select('id, created_at, action, target_table, target_id, metadata, actor_id')
        .in('actor_id', userIds)
        .order('created_at', { ascending: false })
        .range(pageNum * limit, (pageNum + 1) * limit - 1);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (tableFilter !== 'all') {
        query = query.eq('target_table', tableFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[OrgActivityFeed] Error fetching logs:', error);
        return;
      }

      // Enrich with profile data
      const enrichedLogs = (data || []).map(log => {
        const profile = profiles.get(log.actor_id || '');
        return {
          ...log,
          actor_email: profile?.email,
          actor_name: profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.email?.split('@')[0]
        };
      });

      setLogs(enrichedLogs);
      setHasMore((data?.length || 0) === limit);
    } catch (err) {
      console.error('[OrgActivityFeed] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, limit, actionFilter, tableFilter, profiles]);

  useEffect(() => {
    fetchOrgMembers();
  }, [fetchOrgMembers]);

  useEffect(() => {
    if (profiles.size > 0 || !organizationId) {
      fetchLogs(page);
    }
  }, [fetchLogs, page, profiles]);

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
    return format(date, 'dd MMM yyyy HH:mm', { locale: fr });
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

  const getActivityDescription = (log: OrgAuditLogEntry) => {
    const tableLabel = TABLE_LABELS[log.target_table] || log.target_table;
    const actionLabel = getActionLabel(log.action).toLowerCase();
    
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

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (!user) return null;

  if (!organizationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Activité de l'équipe
          </CardTitle>
          <CardDescription>
            Rejoignez une organisation pour voir l'activité de l'équipe
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Activité de l'équipe
            </CardTitle>
            <CardDescription className="mt-1">
              Actions récentes de tous les membres
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v as ActionFilter); setPage(0); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes actions</SelectItem>
                <SelectItem value="INSERT">Créations</SelectItem>
                <SelectItem value="UPDATE">Modifications</SelectItem>
                <SelectItem value="DELETE">Suppressions</SelectItem>
                <SelectItem value="EXPORT">Exports</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={(v) => { setTableFilter(v as TableFilter); setPage(0); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes tables</SelectItem>
                <SelectItem value="sites">Laveries</SelectItem>
                <SelectItem value="profiles">Profils</SelectItem>
                <SelectItem value="user_permissions">Permissions</SelectItem>
                <SelectItem value="operations">Opérations</SelectItem>
                <SelectItem value="organizations">Organisation</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fetchLogs(page)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune activité dans l'équipe</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {logs.map((log) => (
                  <Collapsible
                    key={log.id}
                    open={expandedLog === log.id}
                    onOpenChange={(open) => setExpandedLog(open ? log.id : null)}
                  >
                    <div className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary/10">
                          {getInitials(log.actor_name, log.actor_email)}
                        </AvatarFallback>
                      </Avatar>
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium shrink-0 ${ACTION_COLORS[log.action] || ''}`}
                      >
                        {getActionLabel(log.action)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">
                          {getActivityDescription(log)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          par {log.actor_name || log.actor_email || 'Utilisateur'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {formatTimestamp(log.created_at)}
                      </span>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
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
                        <div className="ml-9 mt-1 mb-2 p-2 bg-muted/30 rounded text-xs font-mono overflow-x-auto">
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
            
            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore || isLoading}
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
