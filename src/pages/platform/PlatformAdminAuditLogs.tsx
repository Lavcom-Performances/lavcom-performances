import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/seo/SEOHead';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ScrollText, 
  Search, 
  Eye,
  Shield,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Download,
  Calendar,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { Json } from '@/integrations/supabase/types';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { buildCsvContent, isLargeExport, LARGE_EXPORT_THRESHOLD } from '@/lib/exports/sanitizeForSpreadsheet';
import { logExport } from '@/lib/exports/exportAuditLogger';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  metadata: Json;
  ip_hash: string | null;
  user_agent: string | null;
  created_at: string;
  actor_email?: string;
}

const PAGE_SIZE = 50;

// Action badge colors based on action type
function getActionBadgeClass(action: string): string {
  if (action.includes('delete') || action.includes('revoke') || action.includes('remove')) {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30';
  }
  if (action.includes('create') || action.includes('insert') || action.includes('grant') || action.includes('add')) {
    return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30';
  }
  if (action.includes('update') || action.includes('edit') || action.includes('modify')) {
    return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30';
  }
  return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30';
}

// Log errors to system_events
async function logQueryError(error: Error, context: string) {
  try {
    await supabase.from('system_events').insert({
      source: 'audit_logs_ui',
      severity: 'error',
      code: 'QUERY_ERROR',
      message: `Audit logs query error: ${error.message}`,
      meta: { context, error_stack: error.stack },
    });
  } catch (e) {
    console.error('Failed to log error to system_events:', e);
  }
}

export default function PlatformAdminAuditLogs() {
  const { isPlatformSuperAdmin, isPlatformAdmin, isLoading: roleLoading } = usePlatformRole();
  const [actorSearch, setActorSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const canAccess = isPlatformSuperAdmin || isPlatformAdmin;

  // Fetch distinct actions for filter dropdown
  const { data: distinctActions } = useQuery({
    queryKey: ['audit-logs-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action')
        .limit(1000);
      
      if (error) throw error;
      
      const actions = [...new Set(data?.map(d => d.action) || [])].sort();
      return actions;
    },
    enabled: canAccess,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Fetch distinct tables for filter dropdown
  const { data: distinctTables } = useQuery({
    queryKey: ['audit-logs-tables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('target_table')
        .limit(1000);
      
      if (error) throw error;
      
      const tables = [...new Set(data?.map(d => d.target_table) || [])].sort();
      return tables;
    },
    enabled: canAccess,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch logs with pagination
  const { data: logsData, isLoading, error: queryError } = useQuery({
    queryKey: ['audit-logs', actionFilter, tableFilter, actorSearch, dateRange?.from, dateRange?.to, page],
    queryFn: async () => {
      try {
        let countQuery = supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true });
        
        let query = supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        // Apply filters
        if (actionFilter && actionFilter !== 'all') {
          query = query.eq('action', actionFilter);
          countQuery = countQuery.eq('action', actionFilter);
        }

        if (tableFilter && tableFilter !== 'all') {
          query = query.eq('target_table', tableFilter);
          countQuery = countQuery.eq('target_table', tableFilter);
        }

        if (dateRange?.from) {
          const fromDate = startOfDay(dateRange.from).toISOString();
          query = query.gte('created_at', fromDate);
          countQuery = countQuery.gte('created_at', fromDate);
        }

        if (dateRange?.to) {
          const toDate = endOfDay(dateRange.to).toISOString();
          query = query.lte('created_at', toDate);
          countQuery = countQuery.lte('created_at', toDate);
        }

        // Actor search (email or UUID)
        if (actorSearch.trim()) {
          // We'll filter after fetching since we need to join with profiles
        }

        const [{ data: logsData, error: logsError }, { count, error: countError }] = await Promise.all([
          query,
          countQuery,
        ]);

        if (logsError) throw logsError;
        if (countError) throw countError;

        // Get actor emails
        const actorIds = [...new Set(logsData?.filter(l => l.actor_id).map(l => l.actor_id) || [])];
        let profilesMap = new Map<string, string>();

        if (actorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', actorIds);
          
          profilesMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
        }

        let logs = (logsData || []).map(log => ({
          ...log,
          actor_email: log.actor_id ? profilesMap.get(log.actor_id) || 'Inconnu' : 'Système',
        })) as AuditLog[];

        // Filter by actor search (post-fetch)
        if (actorSearch.trim()) {
          const search = actorSearch.toLowerCase();
          logs = logs.filter(log =>
            log.actor_email?.toLowerCase().includes(search) ||
            log.actor_id?.toLowerCase().includes(search)
          );
        }

        return {
          logs,
          totalCount: count || 0,
        };
      } catch (error) {
        if (error instanceof Error) {
          await logQueryError(error, 'fetch_audit_logs');
        }
        throw error;
      }
    },
    enabled: canAccess,
    staleTime: 30 * 1000, // 30s
  });

  const totalPages = Math.ceil((logsData?.totalCount || 0) / PAGE_SIZE);
  const logs = logsData?.logs || [];

  // Export filtered logs to CSV
  const handleExport = useCallback(async () => {
    if (!logs.length) return;

    setIsExporting(true);
    try {
      // Build CSV with sanitization
      const headers = ['Timestamp', 'Actor (email)', 'Actor ID', 'Action', 'Target Table', 'Target ID', 'Metadata', 'IP Hash', 'User Agent'];
      const rows = logs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.actor_email || '',
        log.actor_id || '',
        log.action,
        log.target_table,
        log.target_id || '',
        JSON.stringify(log.metadata || {}),
        log.ip_hash || '',
        log.user_agent || '',
      ]);

      // Show warning for large exports
      if (isLargeExport(logs.length)) {
        toast.warning(`Export volumineux: ${logs.length} lignes (seuil: ${LARGE_EXPORT_THRESHOLD}). Cela peut prendre un moment.`);
      }

      const csvContent = buildCsvContent(headers, rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      link.click();

      // Log export to system_events
      await logExport({
        exportType: 'audit_logs_csv',
        recordCount: logs.length,
        dateFrom: dateRange?.from,
        dateTo: dateRange?.to,
        extra: {
          action_filter: actionFilter,
          table_filter: tableFilter,
          actor_search: actorSearch || null,
        },
      });

      toast.success(`Export réussi: ${logs.length} entrées`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Échec de l\'export');
      
      // Log error
      if (error instanceof Error) {
        await logQueryError(error, 'export_audit_logs');
      }
    } finally {
      setIsExporting(false);
    }
  }, [logs, dateRange, actionFilter, tableFilter, actorSearch]);

  // Reset page when filters change
  const handleFilterChange = useCallback((setter: (val: string) => void, value: string) => {
    setPage(0);
    setter(value);
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setPage(0);
    setDateRange(range);
  }, []);

  // Loading state
  if (roleLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Access denied
  if (!canAccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <SEOHead 
          title="Accès refusé | Logs d'audit"
          noindex
        />
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Accès réservé aux administrateurs plateforme.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Logs d'audit | Back-office Plateforme"
        description="Historique des actions sur la plateforme"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <ScrollText className="h-6 w-6 text-primary" />
              Logs d'Audit
            </h1>
            <p className="text-muted-foreground">
              Historique complet des actions sur la plateforme
            </p>
          </div>
          <Button 
            onClick={handleExport}
            disabled={!logs.length || isExporting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exporter CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <ScrollText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{logsData?.totalCount || 0}</p>
                  <p className="text-sm text-muted-foreground">Total (période)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {dateRange?.from ? format(dateRange.from, 'dd MMM', { locale: fr }) : '-'}
                    {' → '}
                    {dateRange?.to ? format(dateRange.to, 'dd MMM', { locale: fr }) : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Période sélectionnée</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Filter className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {[actionFilter !== 'all' && 'Action', tableFilter !== 'all' && 'Table', actorSearch && 'Actor']
                      .filter(Boolean).join(', ') || 'Aucun'}
                  </p>
                  <p className="text-sm text-muted-foreground">Filtres actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date range */}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Période</label>
                <DateRangePicker 
                  dateRange={dateRange} 
                  onDateChange={handleDateRangeChange}
                />
              </div>

              {/* Action filter */}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Action</label>
                <Select 
                  value={actionFilter} 
                  onValueChange={(v) => handleFilterChange(setActionFilter, v)}
                >
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="Toutes les actions" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-60">
                    <SelectItem value="all" className="text-popover-foreground">Toutes les actions</SelectItem>
                    {distinctActions?.map(action => (
                      <SelectItem key={action} value={action} className="text-popover-foreground">
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table filter */}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Table cible</label>
                <Select 
                  value={tableFilter} 
                  onValueChange={(v) => handleFilterChange(setTableFilter, v)}
                >
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="Toutes les tables" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-60">
                    <SelectItem value="all" className="text-popover-foreground">Toutes les tables</SelectItem>
                    {distinctTables?.map(table => (
                      <SelectItem key={table} value={table} className="text-popover-foreground">
                        {table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Actor search */}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Acteur (email/UUID)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={actorSearch}
                    onChange={(e) => {
                      setPage(0);
                      setActorSearch(e.target.value);
                    }}
                    className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error state */}
        {queryError && (
          <Card className="bg-destructive/10 border-destructive/30 mb-6">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">Erreur lors du chargement: {(queryError as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {/* Logs table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Historique des actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Page {page + 1} sur {totalPages || 1} • {logsData?.totalCount || 0} entrée{(logsData?.totalCount || 0) !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Timestamp</TableHead>
                    <TableHead className="text-muted-foreground">Acteur</TableHead>
                    <TableHead className="text-muted-foreground">Action</TableHead>
                    <TableHead className="text-muted-foreground">Table cible</TableHead>
                    <TableHead className="text-muted-foreground">Target ID</TableHead>
                    <TableHead className="text-muted-foreground">Metadata</TableHead>
                    <TableHead className="text-muted-foreground w-16">Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell><Skeleton className="h-4 w-32 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8 bg-muted" /></TableCell>
                      </TableRow>
                    ))
                  ) : logs.length ? (
                    logs.map((log) => {
                      const metadataStr = JSON.stringify(log.metadata || {});
                      const metadataPreview = metadataStr.length > 40 
                        ? metadataStr.substring(0, 40) + '...' 
                        : metadataStr;
                      
                      return (
                        <TableRow key={log.id} className="border-border hover:bg-muted/50">
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-foreground">
                                {format(new Date(log.created_at), 'dd MMM yyyy', { locale: fr })}
                              </span>
                              <span className="text-xs">
                                {format(new Date(log.created_at), 'HH:mm:ss')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-foreground max-w-[200px] truncate" title={log.actor_email}>
                            {log.actor_email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getActionBadgeClass(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">
                            {log.target_table}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs max-w-[100px] truncate" title={log.target_id || '-'}>
                            {log.target_id ? log.target_id.substring(0, 8) + '...' : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-[150px]">
                            <Collapsible>
                              <CollapsibleTrigger className="flex items-center gap-1 hover:text-foreground transition-colors">
                                <span className="truncate">{metadataPreview}</span>
                                {metadataStr.length > 40 && <ChevronDown className="h-3 w-3 flex-shrink-0" />}
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2">
                                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </CollapsibleContent>
                            </Collapsible>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedLog(log)}
                              className="text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        Aucun log d'audit pour cette période
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Affichage {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, logsData?.totalCount || 0)} sur {logsData?.totalCount || 0}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="border-border"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="border-border"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Details dialog */}
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" />
                Détails du log
              </DialogTitle>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Timestamp</p>
                    <p className="text-foreground">
                      {format(new Date(selectedLog.created_at), 'dd MMMM yyyy à HH:mm:ss', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Acteur</p>
                    <p className="text-foreground">{selectedLog.actor_email}</p>
                    {selectedLog.actor_id && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedLog.actor_id}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Action</p>
                    <Badge variant="outline" className={getActionBadgeClass(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Table cible</p>
                    <p className="text-foreground font-mono text-sm">{selectedLog.target_table}</p>
                  </div>
                </div>

                {selectedLog.target_id && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Target ID</p>
                    <p className="text-foreground font-mono text-sm">{selectedLog.target_id}</p>
                  </div>
                )}

                {selectedLog.ip_hash && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">IP Hash</p>
                    <p className="text-foreground font-mono text-xs">{selectedLog.ip_hash}</p>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">User Agent</p>
                    <p className="text-foreground text-xs break-all">{selectedLog.user_agent}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Metadata (JSON)</p>
                  <pre className="bg-muted p-4 rounded-lg text-sm text-muted-foreground overflow-auto max-h-64">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
