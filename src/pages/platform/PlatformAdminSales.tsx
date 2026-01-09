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
import { Download, ChevronLeft, ChevronRight, ExternalLink, CreditCard, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Subscription {
  id: string;
  user_id: string;
  email: string | null;
  company_name: string | null;
  plan_type: string;
  status: string;
  trial_start_date: string | null;
  trial_end_date: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  last_invoice_url: string | null;
  laundry_count: number | null;
  created_at: string;
}

interface BillingResponse {
  total: number;
  subscriptions: Subscription[] | null;
}

const LIMIT = 50;

export default function PlatformAdminSales() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value);
    setPage(0);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-billing', statusFilter, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_billing', {
        p_limit: LIMIT,
        p_offset: page * LIMIT,
        p_status: statusFilter || null,
      });
      if (error) throw error;
      return data as unknown as BillingResponse;
    },
  });

  const exportCSV = () => {
    if (!data?.subscriptions) return;
    
    const headers = ['Email', 'Entreprise', 'Plan', 'Statut', 'Période fin', 'Stripe Customer', 'Stripe Sub', 'Laveries'];
    const rows = data.subscriptions.map(s => [
      s.email || '',
      s.company_name || '',
      s.plan_type,
      s.status,
      s.current_period_end ? format(new Date(s.current_period_end), 'dd/MM/yyyy') : '',
      s.stripe_customer_id || '',
      s.stripe_subscription_id || '',
      s.laundry_count || 1,
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `abonnements_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string, planType: string) => {
    if (status === 'active' && planType === 'trial') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Essai</Badge>;
    }
    if (status === 'active') {
      return <Badge variant="default" className="bg-green-500">Actif</Badge>;
    }
    if (status === 'expired') {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    if (status === 'canceled') {
      return <Badge variant="secondary">Annulé</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const totalPages = Math.ceil((data?.total ?? 0) / LIMIT);

  // Stats
  const activeCount = data?.subscriptions?.filter(s => s.status === 'active').length ?? 0;
  const trialCount = data?.subscriptions?.filter(s => s.plan_type === 'trial' && s.status === 'active').length ?? 0;

  return (
    <>
      <SEOHead 
        title="Ventes | Back-office Plateforme"
        description="Gestion des abonnements"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Ventes & Abonnements</h1>
            <p className="text-muted-foreground">
              {data?.total ?? 0} abonnement{(data?.total ?? 0) > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tous statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
                <SelectItem value="canceled">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={exportCSV} title="Exporter CSV">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{activeCount}</div>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <Receipt className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{trialCount}</div>
                <p className="text-xs text-muted-foreground">En essai</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Période fin</TableHead>
                  <TableHead>Stripe</TableHead>
                  <TableHead>Facture</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.subscriptions?.length ? (
                  data.subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="font-medium">{sub.email || '-'}</div>
                        {sub.company_name && (
                          <div className="text-xs text-muted-foreground">{sub.company_name}</div>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{sub.plan_type}</TableCell>
                      <TableCell>{getStatusBadge(sub.status, sub.plan_type)}</TableCell>
                      <TableCell className="text-sm">
                        {sub.current_period_end 
                          ? format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: fr })
                          : sub.trial_end_date 
                            ? format(new Date(sub.trial_end_date), 'dd MMM yyyy', { locale: fr })
                            : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {sub.stripe_customer_id ? (
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {sub.stripe_customer_id.slice(0, 12)}...
                          </code>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {sub.last_invoice_url ? (
                          <a 
                            href={sub.last_invoice_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                          >
                            Voir <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun abonnement trouvé
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
