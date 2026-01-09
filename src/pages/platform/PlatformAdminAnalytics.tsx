import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/seo/SEOHead';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Map, Building2, MapPin, Eye, EyeOff } from 'lucide-react';

interface GeoStats {
  by_region: Array<{
    region_code: string;
    region_name: string;
    site_count: number;
  }> | null;
  by_department: Array<{
    department_code: string;
    department_name: string;
    region_name: string;
    site_count: number;
  }> | null;
  top_cities: Array<{
    city: string;
    department_code: string;
    site_count: number;
  }> | null;
  hidden_count: number;
}

interface PlatformStats {
  total_users: number;
  total_sites: number;
  total_demo_sites: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  expired_subscriptions: number;
  total_departments: number;
  total_regions: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c', '#d0ed57'];

export default function PlatformAdminAnalytics() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['platform-admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_stats');
      if (error) throw error;
      return data as unknown as PlatformStats;
    },
  });

  const { data: geoStats, isLoading: geoLoading } = useQuery({
    queryKey: ['platform-admin-geo'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_geo', {
        p_min_sites: 1, // Show all for admins (k-anonymity is for public benchmarks)
      });
      if (error) throw error;
      return data as unknown as GeoStats;
    },
  });

  const isLoading = statsLoading || geoLoading;

  const regionChartData = geoStats?.by_region?.map(r => ({
    name: r.region_name,
    sites: r.site_count,
  })) || [];

  const departmentChartData = geoStats?.by_department?.slice(0, 15).map(d => ({
    name: d.department_name,
    sites: d.site_count,
  })) || [];

  return (
    <>
      <SEOHead 
        title="Analytics | Back-office Plateforme"
        description="Statistiques géographiques de la plateforme"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Analytics Plateforme</h1>
          <p className="text-muted-foreground">
            Statistiques géographiques France
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Laveries totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.total_sites ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Map className="h-4 w-4" />
                Régions couvertes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.total_regions ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Départements couverts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.total_departments ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Dép. masqués (k-anon)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{geoStats?.hidden_count ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">{'<5 sites'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Regions Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition par région</CardTitle>
              <CardDescription>Nombre de laveries par région française</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : regionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={regionChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="sites"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {regionChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Aucune donnée
                </div>
              )}
            </CardContent>
          </Card>

          {/* Departments Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top départements</CardTitle>
              <CardDescription>Les 15 départements avec le plus de laveries</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : departmentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="sites" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Aucune donnée
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Cities */}
        <Card>
          <CardHeader>
            <CardTitle>Top villes</CardTitle>
            <CardDescription>Villes avec le plus de laveries (min. 5 pour respect k-anonymat)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-24" />
                ))}
              </div>
            ) : geoStats?.top_cities?.length ? (
              <div className="flex gap-2 flex-wrap">
                {geoStats.top_cities.map((city, index) => (
                  <Badge key={city.city} variant="secondary" className="text-sm py-1 px-3">
                    {city.city} ({city.site_count})
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Pas assez de données (k-anonymat)</p>
            )}
          </CardContent>
        </Card>

        {/* All Departments List */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Tous les départements</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : geoStats?.by_department?.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {geoStats.by_department.map((dept) => (
                  <div 
                    key={dept.department_code} 
                    className="flex items-center justify-between p-2 rounded bg-muted/50"
                  >
                    <span className="text-sm">{dept.department_name}</span>
                    <Badge variant="outline">{dept.site_count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Aucun département</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
