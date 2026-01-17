import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileDown, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export function ExportAuditLogsWidget() {
  const { data: exportEvents, isLoading, refetch } = useQuery({
    queryKey: ['export-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_events')
        .select('id, created_at, code, message, meta')
        .eq('source', 'export')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as ExportEvent[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getExportTypeInfo = (exportType: string | undefined) => {
    if (!exportType) return { label: 'Inconnu', variant: 'outline' as const };
    return EXPORT_TYPE_LABELS[exportType] || { label: exportType, variant: 'outline' as const };
  };

  const formatDateRange = (from?: string, to?: string) => {
    if (!from && !to) return null;
    try {
      const fromDate = from ? format(new Date(from), 'dd/MM/yy', { locale: fr }) : '...';
      const toDate = to ? format(new Date(to), 'dd/MM/yy', { locale: fr }) : '...';
      return `${fromDate} → ${toDate}`;
    } catch {
      return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Exports récents
          </CardTitle>
          <CardDescription>
            Audit des exports de données (50 derniers)
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : exportEvents && exportEvents.length > 0 ? (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="text-right">Enregistrements</TableHead>
                  <TableHead>Période</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportEvents.map((event) => {
                  const exportType = event.meta?.export_type;
                  const typeInfo = getExportTypeInfo(exportType);
                  const dateRange = formatDateRange(event.meta?.date_from, event.meta?.date_to);
                  
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
                        {dateRange || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileDown className="h-8 w-8 mb-2 opacity-50" />
            <p>Aucun export enregistré</p>
            <p className="text-xs">Les prochains exports seront affichés ici</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
