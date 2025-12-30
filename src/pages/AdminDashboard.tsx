import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/seo/SEOHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Building2, 
  TrendingUp, 
  CreditCard,
  CalendarIcon,
  RefreshCw,
  ShieldCheck,
  Activity,
  MapPin
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface GlobalStats {
  total_users: number;
  total_sites: number;
  total_demo_sites: number;
  cities_distribution: Array<{ city: string; count: number }> | null;
  active_subscriptions: number;
  trial_subscriptions: number;
}

interface RevenueStats {
  total_revenue: number;
  total_transactions: number;
  revenue_cb: number;
  revenue_esp: number;
  active_sites: number;
  avg_basket: number;
}

interface TopSite {
  city: string;
  revenue: number;
  transactions: number;
}

interface MonthlySeries {
  year: number;
  month: number;
  revenue: number;
  transactions: number;
  active_sites: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  // Fetch global stats
  const { data: globalStats, isLoading: loadingGlobal, refetch: refetchGlobal } = useQuery({
    queryKey: ['admin-global-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_admin_global_stats');
      if (error) throw error;
      return data as unknown as GlobalStats;
    }
  });

  // Fetch revenue stats
  const { data: revenueStats, isLoading: loadingRevenue, refetch: refetchRevenue } = useQuery({
    queryKey: ['admin-revenue-stats', dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return null;
      const { data, error } = await supabase.rpc('rpc_admin_revenue_stats', {
        p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
        p_end_date: format(dateRange.to, 'yyyy-MM-dd')
      });
      if (error) throw error;
      return data as unknown as RevenueStats;
    },
    enabled: !!dateRange?.from && !!dateRange?.to
  });

  // Fetch top sites
  const { data: topSites, isLoading: loadingTop } = useQuery({
    queryKey: ['admin-top-sites', dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];
      const { data, error } = await supabase.rpc('rpc_admin_top_sites', {
        p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
        p_end_date: format(dateRange.to, 'yyyy-MM-dd'),
        p_limit: 10
      });
      if (error) throw error;
      return (data as unknown as TopSite[]) || [];
    },
    enabled: !!dateRange?.from && !!dateRange?.to
  });

  // Fetch monthly series
  const { data: monthlySeries, isLoading: loadingMonthly } = useQuery({
    queryKey: ['admin-monthly-series', dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];
      const { data, error } = await supabase.rpc('rpc_admin_monthly_series', {
        p_start_date: format(dateRange.from, 'yyyy-MM-dd'),
        p_end_date: format(dateRange.to, 'yyyy-MM-dd')
      });
      if (error) throw error;
      return (data as unknown as MonthlySeries[]) || [];
    },
    enabled: !!dateRange?.from && !!dateRange?.to
  });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const handleRefresh = () => {
    refetchGlobal();
    refetchRevenue();
  };

  // Prepare chart data
  const paymentChartData = revenueStats ? [
    { name: 'Carte bancaire', value: revenueStats.revenue_cb },
    { name: 'Espèces', value: revenueStats.revenue_esp }
  ] : [];

  const monthlyChartData = (monthlySeries || []).map(item => ({
    name: `${item.month}/${item.year}`,
    revenue: item.revenue,
    transactions: item.transactions,
    sites: item.active_sites
  }));

  return (
    <>
      <SEOHead 
        title="Admin Dashboard - Lavcom"
        description="Tableau de bord administrateur"
        noindex={true}
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Administration Lavcom</h1>
              <p className="text-sm text-muted-foreground">Stats globales multi-sites (agrégats uniquement)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange?.from && dateRange?.to 
                    ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                    : 'Sélectionner période'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  locale={fr}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingGlobal ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{globalStats?.total_users || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {globalStats?.active_subscriptions || 0} abonnements actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sites</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingGlobal ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{globalStats?.total_sites || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {globalStats?.total_demo_sites || 0} sites démo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">CA Période</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingRevenue ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(revenueStats?.total_revenue || 0)}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {revenueStats?.active_sites || 0} sites actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingRevenue ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{revenueStats?.total_transactions?.toLocaleString('fr-FR') || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Panier moyen: {formatCurrency(revenueStats?.avg_basket || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activité
            </TabsTrigger>
            <TabsTrigger value="distribution">
              <MapPin className="h-4 w-4 mr-2" />
              Répartition
            </TabsTrigger>
            <TabsTrigger value="top-sites">
              <TrendingUp className="h-4 w-4 mr-2" />
              Top Sites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Monthly Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Évolution du CA</CardTitle>
                  <CardDescription>Chiffre d'affaires mensuel sur la période</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingMonthly ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : monthlyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Période: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      Aucune donnée sur cette période
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition des paiements</CardTitle>
                  <CardDescription>CB vs Espèces sur la période</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingRevenue ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : paymentChartData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={paymentChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {paymentChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      Aucune donnée sur cette période
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Cities Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par ville</CardTitle>
                  <CardDescription>Top 10 des villes avec le plus de sites</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingGlobal ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : globalStats?.cities_distribution && globalStats.cities_distribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={globalStats.cities_distribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis type="category" dataKey="city" className="text-xs" width={100} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      Aucune donnée disponible
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subscriptions */}
              <Card>
                <CardHeader>
                  <CardTitle>Abonnements</CardTitle>
                  <CardDescription>Répartition des types d'abonnements</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingGlobal ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">Abonnements actifs</p>
                          <p className="text-sm text-muted-foreground">Clients payants</p>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {globalStats?.active_subscriptions || 0}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">Essais en cours</p>
                          <p className="text-sm text-muted-foreground">Période d'essai</p>
                        </div>
                        <div className="text-2xl font-bold text-amber-500">
                          {globalStats?.trial_subscriptions || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="top-sites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Sites par CA</CardTitle>
                <CardDescription>Les 10 sites avec le meilleur chiffre d'affaires (villes uniquement)</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTop ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : topSites && topSites.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Ville</TableHead>
                        <TableHead className="text-right">CA</TableHead>
                        <TableHead className="text-right">Transactions</TableHead>
                        <TableHead className="text-right">Panier moyen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topSites.map((site, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{site.city}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(site.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {site.transactions.toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(site.transactions > 0 ? site.revenue / site.transactions : 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    Aucune donnée sur cette période
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
