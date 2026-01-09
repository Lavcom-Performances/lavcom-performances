import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/seo/SEOHead';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download, ChevronLeft, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCentsToEuros, labelForPrice } from '@/lib/salePriceUtils';

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  customer_email: string | null;
  status: string | null;
  currency: string;
  amount_total: number | null;
  amount_subtotal: number | null;
  amount_tax: number | null;
  created_at: string | null;
  paid_at: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  lines: Array<{ price_id?: string; description?: string; amount?: number }> | null;
}

interface InvoicesResponse {
  total: number;
  invoices: Invoice[] | null;
}

const LIMIT = 50;

export default function PlatformSalesInvoices() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['platform-sales-invoices', statusFilter, startDate, endDate, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_invoices', {
        p_status: statusFilter || null,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_limit: LIMIT,
        p_offset: page * LIMIT,
      });
      if (error) throw error;
      return data as unknown as InvoicesResponse;
    },
  });

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value);
    setPage(0);
  };

  const exportCSV = () => {
    if (!data?.invoices) return;
    
    const headers = ['ID', 'Date', 'Email', 'Statut', 'HT', 'TVA', 'TTC', 'URL Facture', 'PDF'];
    const rows = data.invoices.map(inv => [
      inv.stripe_invoice_id,
      inv.created_at ? format(new Date(inv.created_at), 'dd/MM/yyyy') : '',
      inv.customer_email || '',
      inv.status || '',
      inv.amount_subtotal ? (inv.amount_subtotal / 100).toFixed(2) : '',
      inv.amount_tax ? (inv.amount_tax / 100).toFixed(2) : '',
      inv.amount_total ? (inv.amount_total / 100).toFixed(2) : '',
      inv.hosted_invoice_url || '',
      inv.invoice_pdf || '',
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `factures_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Payée</Badge>;
      case 'open':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Ouverte</Badge>;
      case 'void':
        return <Badge variant="secondary">Annulée</Badge>;
      case 'draft':
        return <Badge variant="outline">Brouillon</Badge>;
      case 'uncollectible':
        return <Badge variant="destructive">Irrécouvrable</Badge>;
      default:
        return <Badge variant="secondary">{status || '—'}</Badge>;
    }
  };

  const totalPages = Math.ceil((data?.total ?? 0) / LIMIT);

  return (
    <>
      <SEOHead 
        title="Factures | Back-office Plateforme"
        description="Liste des factures Stripe"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Factures</h1>
            <p className="text-muted-foreground">
              {data?.total ?? 0} facture{(data?.total ?? 0) > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              className="w-36"
              placeholder="Date début"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
              className="w-36"
              placeholder="Date fin"
            />
            <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="open">Ouverte</SelectItem>
                <SelectItem value="void">Annulée</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={exportCSV} title="Exporter CSV">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">HT</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="text-right">TTC</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.invoices?.length ? (
                  data.invoices.map((inv) => {
                    const firstLine = inv.lines?.[0];
                    const productLabel = firstLine?.price_id 
                      ? labelForPrice(firstLine.price_id) 
                      : firstLine?.description || '—';

                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm">
                          {inv.created_at 
                            ? format(new Date(inv.created_at), 'dd MMM yyyy', { locale: fr })
                            : '—'
                          }
                        </TableCell>
                        <TableCell>{inv.customer_email || '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm" title={productLabel}>
                          {productLabel}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCentsToEuros(inv.amount_subtotal)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatCentsToEuros(inv.amount_tax)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCentsToEuros(inv.amount_total)}
                        </TableCell>
                        <TableCell>{getStatusBadge(inv.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {inv.hosted_invoice_url && (
                              <a 
                                href={inv.hosted_invoice_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                                title="Voir facture"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {inv.invoice_pdf && (
                              <a 
                                href={inv.invoice_pdf} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm"
                                title="Télécharger PDF"
                              >
                                <FileText className="h-4 w-4" />
                              </a>
                            )}
                            {!inv.hosted_invoice_url && !inv.invoice_pdf && '—'}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucune facture trouvée
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} sur {totalPages}
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
      </div>
    </>
  );
}
