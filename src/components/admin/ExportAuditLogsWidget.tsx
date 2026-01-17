import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Download, FileDown, RefreshCw, CalendarIcon, Filter, X } from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface ExportEvent {
  id: number;
  created_at: string;
  code: string;
  message: string;
  meta: {
    actor_user_id?: string;
    actor_email?: string;
    export_type?: string;
    record_count?: number;
    site_id?: string;
    date_from?: string;
    date_to?: string;
  } | null;
}

const EXPORT_TYPE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  operations_csv: { label: 'Opérations CSV', variant: 'default' },
  operations_pdf: { label: 'Opérations PDF', variant: 'default' },
  invoices_csv: { label: 'Factures CSV', variant: 'secondary' },
  report_pdf: { label: 'Rapport PDF', variant: 'secondary' },
  cron_logs_csv: { label: 'Logs CRON', variant: 'outline' },
  subscription_metrics_csv: { label: 'Métriques Abo', variant: 'outline' },
  products_sales_csv: { label: 'Ventes Produits', variant: 'outline' },
  monthly_revenue_csv: { label: 'CA Mensuel', variant: 'outline' },
  annual_revenue_csv: { label: 'CA Annuel', variant: 'outline' },
  comparison_csv: { label: 'Comparaison CSV', variant: 'secondary' },
  comparison_pdf: { label: 'Comparaison PDF', variant: 'secondary' },
  profitability_csv: { label: 'Rentabilité CSV', variant: 'secondary' },
  profitability_pdf: { label: 'Rentabilité PDF', variant: 'secondary' },
  audit_logs_csv: { label: 'Audit Logs', variant: 'outline' },
  admin_logins_csv: { label: 'Connexions Admin', variant: 'outline' },
  users_csv: { label: 'Utilisateurs', variant: 'outline' },
  login_history_csv: { label: 'Historique Login', variant: 'outline' },
};

const EXPORT_TYPE_OPTIONS = [
  { value: 'all', label: 'Tous les types' },
  { value: 'operations_csv', label: 'Opérations CSV' },
  { value: 'operations_pdf', label: 'Opérations PDF' },
  { value: 'invoices_csv', label: 'Factures CSV' },
  { value: 'report_pdf', label: 'Rapport PDF' },
  { value: 'cron_logs_csv', label: 'Logs CRON' },
  { value: 'subscription_metrics_csv', label: 'Métriques Abo' },
  { value: 'products_sales_csv', label: 'Ventes Produits' },
  { value: 'monthly_revenue_csv', label: 'CA Mensuel' },
  { value: 'annual_revenue_csv', label: 'CA Annuel' },
  { value: 'comparison_csv', label: 'Comparaison CSV' },
  { value: 'comparison_pdf', label: 'Comparaison PDF' },
  { value: 'profitability_csv', label: 'Rentabilité CSV' },
  { value: 'profitability_pdf', label: 'Rentabilité PDF' },
  { value: 'audit_logs_csv', label: 'Audit Logs' },
  { value: 'admin_logins_csv', label: 'Connexions Admin' },
  { value: 'users_csv', label: 'Utilisateurs' },
  { value: 'login_history_csv', label: 'Historique Login' },
];

export function ExportAuditLogsWidget() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: exportEvents, isLoading, refetch } = useQuery({
    queryKey: ['export-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_events')
        .select('id, created_at, code, message, meta')
        .eq('source', 'export')
        .order('created_at', { ascending: false })
        .limit(200); // Fetch more for filtering
      
      if (error) throw error;
      return (data || []) as ExportEvent[];
    },
    refetchInterval: 60000,
  });

  // Apply filters
  const filteredEvents = useMemo(() => {
    if (!exportEvents) return [];
    
    return exportEvents.filter(event => {
      // Type filter
      if (typeFilter !== 'all') {
        const eventType = event.meta?.export_type;
        if (eventType !== typeFilter) return false;
      }
      
      // Date range filter
      if (dateRange?.from && dateRange?.to) {
        const eventDate = new Date(event.created_at);
        if (!isWithinInterval(eventDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to)
        })) {
          return false;
        }
      }
      
      return true;
    });
  }, [exportEvents, typeFilter, dateRange]);

  const hasActiveFilters = typeFilter !== 'all' || dateRange;

  const clearFilters = () => {
    setTypeFilter('all');
    setDateRange(undefined);
  };

  const getExportTypeInfo = (exportType: string | undefined) => {
    if (!exportType) return { label: 'Inconnu', variant: 'outline' as const };
    return EXPORT_TYPE_LABELS[exportType] || { label: exportType, variant: 'outline' as const };
  };

  const formatDateRangeDisplay = (from?: string, to?: string) => {
    if (!from && !to) return null;
    try {
      const fromDate = from ? format(new Date(from), 'dd/MM/yy', { locale: fr }) : '...';
      const toDate = to ? format(new Date(to), 'dd/MM/yy', { locale: fr }) : '...';
      return `${fromDate} → ${toDate}`;
    } catch {
      return null;
    }
  };

  // Stats summary
  const stats = useMemo(() => {
    const totalRecords = filteredEvents.reduce((sum, e) => sum + (e.meta?.record_count || 0), 0);
    const uniqueUsers = new Set(filteredEvents.map(e => e.meta?.actor_email || e.meta?.actor_user_id)).size;
    return { totalRecords, uniqueUsers, count: filteredEvents.length };
  }, [filteredEvents]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Exports récents
          </CardTitle>
          <CardDescription>
            Audit des exports de données pour conformité
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-muted/50">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Type d'export</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] h-9 bg-background">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-[300px]">
                {EXPORT_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Période</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] h-9 justify-start gap-2 bg-background">
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange?.from && dateRange?.to 
                    ? `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}`
                    : 'Toutes les dates'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  locale={fr}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
                {dateRange && (
                  <div className="p-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setDateRange(undefined)}
                    >
                      Effacer les dates
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1">
              <X className="h-3 w-3" />
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-2xl font-bold">{stats.count}</div>
            <div className="text-xs text-muted-foreground">Exports</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-2xl font-bold">{stats.totalRecords.toLocaleString('fr-FR')}</div>
            <div className="text-xs text-muted-foreground">Enregistrements</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            <div className="text-xs text-muted-foreground">Utilisateurs</div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="max-h-[350px] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="text-right">Enregistrements</TableHead>
                  <TableHead>Période données</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => {
                  const exportType = event.meta?.export_type;
                  const typeInfo = getExportTypeInfo(exportType);
                  const dataDateRange = formatDateRangeDisplay(event.meta?.date_from, event.meta?.date_to);
                  
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(event.created_at), 'dd/MM HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeInfo.variant} className="whitespace-nowrap">
                          <Download className="h-3 w-3 mr-1" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground">
                        {event.meta?.actor_email || event.meta?.actor_user_id?.slice(0, 8) || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {event.meta?.record_count?.toLocaleString('fr-FR') || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {dataDateRange || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-md">
            {hasActiveFilters ? (
              <>
                <Filter className="h-8 w-8 mb-2 opacity-50" />
                <p>Aucun export correspondant aux filtres</p>
                <Button variant="link" size="sm" onClick={clearFilters}>
                  Réinitialiser les filtres
                </Button>
              </>
            ) : (
              <>
                <FileDown className="h-8 w-8 mb-2 opacity-50" />
                <p>Aucun export enregistré</p>
                <p className="text-xs">Les prochains exports seront affichés ici</p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
