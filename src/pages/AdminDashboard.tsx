import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/seo/SEOHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  TrendingUp, 
  CreditCard,
  CalendarIcon,
  RefreshCw,
  ShieldCheck,
  Activity,
  MapPin,
  FileText,
  Eye,
  Download,
  Bell,
  Brain
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { sanitizeForCsv, buildCsvLine, logExport } from '@/lib/exports';
import { SubscriptionMetricsExport } from '@/components/admin/SubscriptionMetricsExport';
import { ChurnAlertSettings } from '@/components/admin/ChurnAlertSettings';
import { RetentionDashboard } from '@/components/admin/RetentionDashboard';
import { SystemStatusWidget } from '@/components/admin/SystemStatusWidget';
import { ChurnPredictionsDashboard } from '@/components/admin/ChurnPredictionsDashboard';
import { ExportAuditLogsWidget } from '@/components/admin/ExportAuditLogsWidget';
import { MfaMonitoringWidget } from '@/components/admin/MfaMonitoringWidget';

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

interface SubscriptionMetrics {
  active_subscriptions: number;
  trial_subscriptions: number;
  past_due_subscriptions: number;
  canceled_subscriptions: number;
  monthly_subscriptions: number;
  annual_subscriptions: number;
  total_laundries_subscribed: number;
  mrr_estimated: number;
  churn_current_month: number;
  new_subscriptions_current_month: number;
  trial_conversions_current_month: number;
  trials_expiring_soon: number;
  status_breakdown: Array<{ status: string; count: number }> | null;
  monthly_trend: Array<{ month: string; active: number; new: number; churned: number }> | null;
}

interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  admin_profile?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  view_global_stats: { label: 'Stats globales', icon: <Users className="h-4 w-4" /> },
  view_revenue_stats: { label: 'Stats CA', icon: <TrendingUp className="h-4 w-4" /> },
  view_top_sites: { label: 'Top sites', icon: <Building2 className="h-4 w-4" /> },
  view_monthly_series: { label: 'Séries mensuelles', icon: <Activity className="h-4 w-4" /> },
  view_subscription_metrics: { label: 'Métriques abonnements', icon: <CreditCard className="h-4 w-4" /> },
  view_retention_metrics: { label: 'Métriques rétention', icon: <Users className="h-4 w-4" /> },
  view_churn_predictions: { label: 'Prédictions churn', icon: <Brain className="h-4 w-4" /> },
};

const ACTION_OPTIONS = [
  { value: 'all', label: 'Toutes les actions' },
  { value: 'view_global_stats', label: 'Stats globales' },
  { value: 'view_revenue_stats', label: 'Stats CA' },
  { value: 'view_top_sites', label: 'Top sites' },
  { value: 'view_monthly_series', label: 'Séries mensuelles' },
  { value: 'view_subscription_metrics', label: 'Métriques abonnements' },
  { value: 'view_retention_metrics', label: 'Métriques rétention' },
  { value: 'view_churn_predictions', label: 'Prédictions churn' },
];

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  // Audit filters
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditDateRange, setAuditDateRange] = useState<DateRange | undefined>();
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

  // Fetch subscription metrics
  const { data: subMetrics, isLoading: loadingSubMetrics, refetch: refetchSubMetrics } = useQuery({
    queryKey: ['admin-subscription-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_admin_subscription_metrics');
      if (error) throw error;
      return data as unknown as SubscriptionMetrics;
    }
  });

  // Fetch audit logs with profile data
  const { data: auditLogs, isLoading: loadingAudit, refetch: refetchAudit } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      // Fetch profiles for admin users
      const adminIds = [...new Set((data || []).map(log => log.admin_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', adminIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return (data || []).map(log => ({
        ...log,
        admin_profile: profileMap.get(log.admin_user_id) || null
      })) as AuditLog[];
    }
  });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const handleRefresh = () => {
    refetchGlobal();
    refetchRevenue();
    refetchAudit();
    refetchSubMetrics();
  };

  // Export audit logs to CSV
  const exportAuditLogsCSV = async (logs: AuditLog[]) => {
    const headers = ['Date', 'Action', 'Détails', 'Admin'];
    
    // Sanitize all text fields
    const rows = logs.map(log => {
      const adminName = log.admin_profile
        ? `${log.admin_profile.first_name || ''} ${log.admin_profile.last_name || ''} (${log.admin_profile.email})`.trim()
        : log.admin_user_id;
      return [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        sanitizeForCsv(ACTION_LABELS[log.action]?.label || log.action),
        sanitizeForCsv(Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : ''),
        sanitizeForCsv(adminName)
      ];
    });
    
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(';'), ...rows.map(row => buildCsvLine(row, ';'))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Audit log the export
    logExport({
      exportType: 'audit_logs_csv',
      recordCount: logs.length,
    });
  };

  // Prepare chart data
  const paymentChartData = revenueStats ? [
    { name: 'CB', value: revenueStats.revenue_cb },
    { name: 'ESP', value: revenueStats.revenue_esp }
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

        {/* System Status Widget + Quick Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* System Status Widget - Admin site uniquement */}
          <div className="lg:col-span-1 space-y-4">
            <SystemStatusWidget />
            <MfaMonitoringWidget />
          </div>
          
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
        <Tabs defaultValue="subscriptions" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="subscriptions">
              <CreditCard className="h-4 w-4 mr-2" />
              Abonnements
            </TabsTrigger>
            <TabsTrigger value="retention">
              <Users className="h-4 w-4 mr-2" />
              Rétention
            </TabsTrigger>
            <TabsTrigger value="predictions">
              <Brain className="h-4 w-4 mr-2" />
              Prédictions ML
            </TabsTrigger>
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
            <TabsTrigger value="alerts">
              <Bell className="h-4 w-4 mr-2" />
              Alertes
            </TabsTrigger>
            <TabsTrigger value="exports">
              <Download className="h-4 w-4 mr-2" />
              Exports
            </TabsTrigger>
            <TabsTrigger value="audit">
              <FileText className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          {/* Subscriptions Tab - NEW */}
          <TabsContent value="subscriptions" className="space-y-4">
            {/* Export button */}
            <div className="flex justify-end">
              <SubscriptionMetricsExport 
                metrics={subMetrics || null} 
                disabled={loadingSubMetrics} 
              />
            </div>
            {/* MRR & Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">MRR Estimé</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  {loadingSubMetrics ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(subMetrics?.mrr_estimated || 0)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Revenu mensuel récurrent
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Abonnements actifs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingSubMetrics ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">{subMetrics?.active_subscriptions || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {subMetrics?.total_laundries_subscribed || 0} laveries
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Essais en cours</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loadingSubMetrics ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">{subMetrics?.trial_subscriptions || 0}</div>
                  )}
                  <p className="text-xs text-amber-500">
                    {subMetrics?.trials_expiring_soon || 0} expirent sous 7j
                  </p>
                </CardContent>
              </Card>

              <Card className={subMetrics?.churn_current_month ? "border-red-500/20" : ""}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Churn ce mois</CardTitle>
                  <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                </CardHeader>
                <CardContent>
                  {loadingSubMetrics ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold text-red-500">{subMetrics?.churn_current_month || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Abonnements annulés
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Second row */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Nouveaux ce mois</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSubMetrics ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold text-emerald-500">+{subMetrics?.new_subscriptions_current_month || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Conversions trial</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSubMetrics ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold text-blue-500">{subMetrics?.trial_conversions_current_month || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Impayés</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSubMetrics ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className={`text-2xl font-bold ${(subMetrics?.past_due_subscriptions || 0) > 0 ? 'text-amber-500' : ''}`}>
                      {subMetrics?.past_due_subscriptions || 0}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Plan Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition des plans</CardTitle>
                  <CardDescription>Mensuel vs Annuel</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSubMetrics ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Mensuel', value: subMetrics?.monthly_subscriptions || 0 },
                            { name: 'Annuel', value: subMetrics?.annual_subscriptions || 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          <Cell fill="hsl(var(--primary))" />
                          <Cell fill="hsl(var(--chart-2))" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des abonnements</CardTitle>
                  <CardDescription>Derniers 6 mois</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSubMetrics || !subMetrics?.monthly_trend ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={subMetrics.monthly_trend.map(item => ({
                        ...item,
                        month: format(new Date(item.month), 'MMM', { locale: fr })
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="active" name="Actifs" fill="hsl(var(--primary))" />
                        <Bar dataKey="new" name="Nouveaux" fill="hsl(var(--chart-2))" />
                        <Bar dataKey="churned" name="Churn" fill="hsl(var(--destructive))" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition par statut</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSubMetrics ? (
                  <Skeleton className="h-[100px] w-full" />
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {subMetrics?.status_breakdown?.map((item) => (
                      <div key={item.status} className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
                        <Badge variant={
                          item.status === 'active' ? 'default' :
                          item.status === 'canceled' ? 'destructive' :
                          item.status === 'past_due' ? 'secondary' : 'outline'
                        }>
                          {item.status}
                        </Badge>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Retention Tab */}
          <TabsContent value="retention" className="space-y-4">
            <RetentionDashboard />
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <ChurnPredictionsDashboard />
          </TabsContent>

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
                  <CardDescription>CB vs ESP sur la période</CardDescription>
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

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <ChurnAlertSettings />
          </TabsContent>

          {/* Exports Tab */}
          <TabsContent value="exports" className="space-y-4">
            <ExportAuditLogsWidget />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Journal d'audit
                  </CardTitle>
                  <CardDescription>Historique des actions administrateur (100 dernières)</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Type d'action</label>
                    <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                      <SelectTrigger className="w-[200px] bg-background">
                        <SelectValue placeholder="Toutes les actions" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {ACTION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Période</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[240px] justify-start gap-2 bg-background">
                          <CalendarIcon className="h-4 w-4" />
                          {auditDateRange?.from && auditDateRange?.to 
                            ? `${format(auditDateRange.from, 'dd/MM/yy')} - ${format(auditDateRange.to, 'dd/MM/yy')}`
                            : 'Toutes les dates'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover" align="start">
                        <Calendar
                          mode="range"
                          selected={auditDateRange}
                          onSelect={setAuditDateRange}
                          locale={fr}
                          numberOfMonths={2}
                          className="pointer-events-auto"
                        />
                        {auditDateRange && (
                          <div className="p-2 border-t">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full"
                              onClick={() => setAuditDateRange(undefined)}
                            >
                              Effacer les dates
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Export button */}
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const filteredLogs = (auditLogs || []).filter(log => {
                        if (auditActionFilter !== 'all' && log.action !== auditActionFilter) return false;
                        if (auditDateRange?.from && auditDateRange?.to) {
                          const logDate = new Date(log.created_at);
                          if (logDate < auditDateRange.from || logDate > auditDateRange.to) return false;
                        }
                        return true;
                      });
                      exportAuditLogsCSV(filteredLogs);
                    }}
                    disabled={!auditLogs || auditLogs.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Exporter CSV
                  </Button>
                </div>

                {/* Table */}
                {loadingAudit ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (() => {
                  // Apply filters
                  const filteredLogs = (auditLogs || []).filter(log => {
                    if (auditActionFilter !== 'all' && log.action !== auditActionFilter) return false;
                    if (auditDateRange?.from && auditDateRange?.to) {
                      const logDate = new Date(log.created_at);
                      if (logDate < auditDateRange.from || logDate > auditDateRange.to) return false;
                    }
                    return true;
                  });

                  return filteredLogs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Détails</TableHead>
                          <TableHead>Admin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => {
                          const actionInfo = ACTION_LABELS[log.action] || { 
                            label: log.action, 
                            icon: <Eye className="h-4 w-4" /> 
                          };
                          return (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm">
                                {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="gap-1">
                                  {actionInfo.icon}
                                  {actionInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                {Object.keys(log.details).length > 0 
                                  ? JSON.stringify(log.details)
                                  : '-'
                                }
                              </TableCell>
                              <TableCell className="text-sm">
                                {log.admin_profile ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {log.admin_profile.first_name || log.admin_profile.last_name
                                        ? `${log.admin_profile.first_name || ''} ${log.admin_profile.last_name || ''}`.trim()
                                        : log.admin_profile.email
                                      }
                                    </span>
                                    {(log.admin_profile.first_name || log.admin_profile.last_name) && (
                                      <span className="text-xs text-muted-foreground">{log.admin_profile.email}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {log.admin_user_id.substring(0, 8)}...
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex h-32 items-center justify-center text-muted-foreground">
                      Aucun log correspondant aux filtres
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
