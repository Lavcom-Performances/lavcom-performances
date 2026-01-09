import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Search, Download, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlatformSite {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  department_code: string | null;
  department_name: string | null;
  region_code: string | null;
  region_name: string | null;
  created_at: string;
  user_id: string;
  owner_email: string | null;
  owner_company: string | null;
}

interface SitesResponse {
  total: number;
  sites: PlatformSite[] | null;
}

interface GeoRegion {
  department_code: string;
  department_name: string;
  region_code: string;
  region_name: string;
}

const LIMIT = 50;

// Get unique regions from departments
const REGIONS = [
  { code: 'ARA', name: 'Auvergne-Rhône-Alpes' },
  { code: 'BFC', name: 'Bourgogne-Franche-Comté' },
  { code: 'BRE', name: 'Bretagne' },
  { code: 'CVL', name: 'Centre-Val de Loire' },
  { code: 'COR', name: 'Corse' },
  { code: 'GES', name: 'Grand Est' },
  { code: 'HDF', name: 'Hauts-de-France' },
  { code: 'IDF', name: 'Île-de-France' },
  { code: 'NOR', name: 'Normandie' },
  { code: 'NAQ', name: 'Nouvelle-Aquitaine' },
  { code: 'OCC', name: 'Occitanie' },
  { code: 'PDL', name: 'Pays de la Loire' },
  { code: 'PAC', name: 'Provence-Alpes-Côte d\'Azur' },
];

export default function PlatformAdminSites() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [region, setRegion] = useState<string>('');
  const [page, setPage] = useState(0);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const handleRegionChange = (value: string) => {
    setRegion(value === 'all' ? '' : value);
    setPage(0);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-sites', debouncedSearch, region, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_sites', {
        p_limit: LIMIT,
        p_offset: page * LIMIT,
        p_search: debouncedSearch || null,
        p_department: null,
        p_region: region || null,
      });
      if (error) throw error;
      return data as unknown as SitesResponse;
    },
  });

  const exportCSV = () => {
    if (!data?.sites) return;
    
    const headers = ['Nom', 'Adresse', 'Ville', 'Code Postal', 'Département', 'Région', 'Propriétaire', 'Créé le'];
    const rows = data.sites.map(s => [
      s.name,
      s.address || '',
      s.city || '',
      s.postal_code || '',
      s.department_name || '',
      s.region_name || '',
      s.owner_email || '',
      format(new Date(s.created_at), 'dd/MM/yyyy'),
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sites_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  const totalPages = Math.ceil((data?.total ?? 0) / LIMIT);

  return (
    <>
      <SEOHead 
        title="Laveries | Back-office Plateforme"
        description="Liste des laveries de la plateforme"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Laveries</h1>
            <p className="text-muted-foreground">
              {data?.total ?? 0} laverie{(data?.total ?? 0) > 1 ? 's' : ''} enregistrées
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            <Select value={region || 'all'} onValueChange={handleRegionChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Toutes régions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes régions</SelectItem>
                {REGIONS.map(r => (
                  <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                ))}
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
                  <TableHead>Nom</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Région</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.sites?.length ? (
                  data.sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
                          <div className="text-sm">
                            {site.city || '-'}
                            {site.postal_code && (
                              <span className="text-muted-foreground"> ({site.postal_code})</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {site.department_name || site.department_code || '-'}
                      </TableCell>
                      <TableCell className="text-sm">{site.region_name || '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">{site.owner_email || '-'}</div>
                        {site.owner_company && (
                          <div className="text-xs text-muted-foreground">{site.owner_company}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(site.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucune laverie trouvée
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
