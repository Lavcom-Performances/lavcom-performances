import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  ScrollText, 
  Search, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Download,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { buildCsvContent } from '@/lib/exports/sanitizeForSpreadsheet';
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
}

const PAGE_SIZE = 25;

// Action badge colors
function getActionBadgeClass(action: string): string {
  if (action.includes('DELETE') || action.includes('delete') || action.includes('remove')) {
    return 'bg-destructive/10 text-destructive border-destructive/20';
  }
  if (action.includes('INSERT') || action.includes('create') || action.includes('add')) {
    return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30';
  }
  if (action.includes('UPDATE') || action.includes('edit') || action.includes('modify')) {
    return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30';
  }
  if (action.includes('EXPORT')) {
    return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30';
  }
  return 'bg-muted text-muted-foreground border-border';
}

// Table name translations
const tableTranslations: Record<string, string> = {
  sites: 'Sites',
  operations: 'Opérations',
  profiles: 'Profils',
  user_permissions: 'Permissions',
  user_roles: 'Rôles',
  team_invitations: 'Invitations',
  organizations: 'Organisations',
  subscriptions: 'Abonnements',
  site_access: 'Accès sites',
  audit_logs: 'Journaux',
};

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch user's audit logs
  const { data: logsData, isLoading, error, refetch } = useQuery({
    queryKey: ['user-audit-logs', user?.id, actionFilter, tableFilter, dateRange?.from, dateRange?.to, page, searchQuery],
    queryFn: async () => {
      if (!user?.id) return { logs: [], totalCount: 0 };

      let countQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('actor_id', user.id);
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('actor_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Apply filters
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
        countQuery = countQuery.eq('action', actionFilter);
      }

      if (tableFilter !== 'all') {
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

      if (searchQuery.trim()) {
        // Search in target_id
        query = query.or(`target_id.ilike.%${searchQuery}%,target_table.ilike.%${searchQuery}%`);
        countQuery = countQuery.or(`target_id.ilike.%${searchQuery}%,target_table.ilike.%${searchQuery}%`);
      }

      const [{ data: logsData, error: logsError }, { count, error: countError }] = await Promise.all([
        query,
        countQuery,
      ]);

      if (logsError) throw logsError;
      if (countError) throw countError;

      return {
        logs: (logsData || []) as AuditLog[],
        totalCount: count || 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  // Fetch distinct actions
  const { data: distinctActions } = useQuery({
    queryKey: ['user-audit-logs-actions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data } = await supabase
        .from('audit_logs')
        .select('action')
        .eq('actor_id', user.id)
        .limit(500);
      
      return [...new Set(data?.map(d => d.action) || [])].sort();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch distinct tables
  const { data: distinctTables } = useQuery({
    queryKey: ['user-audit-logs-tables', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data } = await supabase
        .from('audit_logs')
        .select('target_table')
        .eq('actor_id', user.id)
        .limit(500);
      
      return [...new Set(data?.map(d => d.target_table) || [])].sort();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const totalPages = Math.ceil((logsData?.totalCount || 0) / PAGE_SIZE);
  const logs = logsData?.logs || [];

  // Reset page on filter change
  const handleFilterChange = useCallback((setter: (val: string) => void, value: string) => {
    setPage(0);
    setter(value);
  }, []);

  // Export to CSV
  const handleExport = useCallback(async () => {
    if (!logs.length) return;

    setIsExporting(true);
    try {
      const headers = ['Date', 'Action', 'Table', 'ID Cible', 'Métadonnées'];
      const rows = logs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.action,
        log.target_table,
        log.target_id || '',
        JSON.stringify(log.metadata || {}),
      ]);

      const csvContent = buildCsvContent(headers, rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `mes-journaux-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      await logExport({
        exportType: 'audit_logs_csv',
        recordCount: logs.length,
        dateFrom: dateRange?.from,
        dateTo: dateRange?.to,
      });

      toast.success(`${logs.length} entrées exportées`);
    } catch (error) {
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  }, [logs, dateRange]);

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Veuillez vous connecter pour accéder à vos journaux.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Mes journaux d'audit | Historique des actions"
        description="Consultez l'historique de vos actions sur la plateforme"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <ScrollText className="h-6 w-6 text-primary" />
              Mes journaux d'audit
            </h1>
            <p className="text-muted-foreground text-sm">
              Historique de vos actions sur la plateforme
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            <Button 
              onClick={handleExport}
              disabled={!logs.length || isExporting}
              size="sm"
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Exporter
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <ScrollText className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-xl font-bold">{logsData?.totalCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Total entrées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">
                    {dateRange?.from ? format(dateRange.from, 'dd MMM', { locale: fr }) : '-'}
                    {' → '}
                    {dateRange?.to ? format(dateRange.to, 'dd MMM', { locale: fr }) : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Période</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Filter className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">
                    {[actionFilter !== 'all' && 'Action', tableFilter !== 'all' && 'Table', searchQuery && 'Recherche']
                      .filter(Boolean).join(', ') || 'Aucun'}
                  </p>
                  <p className="text-xs text-muted-foreground">Filtres actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">
                    {logs[0] ? format(new Date(logs[0].created_at), 'dd/MM HH:mm', { locale: fr }) : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Dernière action</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
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
                  onDateChange={(range) => {
                    setPage(0);
                    setDateRange(range);
                  }}
                />
              </div>

              {/* Action filter */}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Action</label>
                <Select 
                  value={actionFilter} 
                  onValueChange={(v) => handleFilterChange(setActionFilter, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    {distinctActions?.map(action => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les tables" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les tables</SelectItem>
                    {distinctTables?.map(table => (
                      <SelectItem key={table} value={table}>
                        {tableTranslations[table] || table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Recherche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ID cible, table..."
                    value={searchQuery}
                    onChange={(e) => {
                      setPage(0);
                      setSearchQuery(e.target.value);
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center">
                <ScrollText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune entrée trouvée pour cette période.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Date</TableHead>
                        <TableHead className="w-[100px]">Action</TableHead>
                        <TableHead className="w-[120px]">Table</TableHead>
                        <TableHead>Cible</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/50">
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getActionBadgeClass(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {tableTranslations[log.target_table] || log.target_table}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {log.target_id || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {page + 1} sur {totalPages} ({logsData?.totalCount} entrées)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Détails de l'action
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="text-sm font-medium">
                      {format(new Date(selectedLog.created_at), 'dd MMM yyyy HH:mm:ss', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Action</p>
                    <Badge variant="outline" className={getActionBadgeClass(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Table</p>
                    <p className="text-sm font-medium">
                      {tableTranslations[selectedLog.target_table] || selectedLog.target_table}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ID Cible</p>
                    <p className="text-sm font-mono truncate">{selectedLog.target_id || '-'}</p>
                  </div>
                </div>
                
                {selectedLog.metadata && Object.keys(selectedLog.metadata as object).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Métadonnées</p>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-48">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
