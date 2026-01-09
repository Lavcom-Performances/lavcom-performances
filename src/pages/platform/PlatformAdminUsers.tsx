import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Search, Download, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlatformUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  created_at: string;
  site_count: number;
  plan_type: string | null;
  subscription_status: string | null;
  trial_end_date: string | null;
  current_period_end: string | null;
}

interface UsersResponse {
  total: number;
  users: PlatformUser[] | null;
}

const LIMIT = 50;

export default function PlatformAdminUsers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);

  // Debounce search
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    // Simple debounce
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-users', debouncedSearch, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_users', {
        p_limit: LIMIT,
        p_offset: page * LIMIT,
        p_search: debouncedSearch || null,
      });
      if (error) throw error;
      return data as unknown as UsersResponse;
    },
  });

  const exportCSV = () => {
    if (!data?.users) return;
    
    const headers = ['Email', 'Prénom', 'Nom', 'Entreprise', 'Inscrit le', 'Sites', 'Plan', 'Statut'];
    const rows = data.users.map(u => [
      u.email,
      u.first_name || '',
      u.last_name || '',
      u.company_name || '',
      format(new Date(u.created_at), 'dd/MM/yyyy'),
      u.site_count,
      u.plan_type || '',
      u.subscription_status || '',
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string | null, planType: string | null) => {
    if (!status) return <Badge variant="secondary">-</Badge>;
    
    if (status === 'active' && planType === 'trial') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Essai</Badge>;
    }
    if (status === 'active') {
      return <Badge variant="default" className="bg-green-500">Actif</Badge>;
    }
    if (status === 'expired' || status === 'canceled') {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const totalPages = Math.ceil((data?.total ?? 0) / LIMIT);

  return (
    <>
      <SEOHead 
        title="Utilisateurs | Back-office Plateforme"
        description="Liste des utilisateurs de la plateforme"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Utilisateurs</h1>
            <p className="text-muted-foreground">
              {data?.total ?? 0} utilisateur{(data?.total ?? 0) > 1 ? 's' : ''} inscrits
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email ou entreprise..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
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
                  <TableHead>Email</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead className="text-center">Sites</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.users?.length ? (
                  data.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.email}</div>
                        {(user.first_name || user.last_name) && (
                          <div className="text-xs text-muted-foreground">
                            {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{user.company_name || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {user.site_count}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize">{user.plan_type || '-'}</TableCell>
                      <TableCell>{getStatusBadge(user.subscription_status, user.plan_type)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun utilisateur trouvé
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
