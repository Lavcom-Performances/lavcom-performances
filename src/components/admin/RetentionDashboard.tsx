import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Clock, 
  Target,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';

interface RetentionMetrics {
  avg_subscription_duration_days: number;
  avg_ltv: number;
  total_ltv: number;
  current_retention_rate: number;
  overall_retention_rate: number;
  trial_conversion_rate: number;
  cohorts: Array<{
    cohort_month: string;
    total_started: number;
    still_active: number;
    churned: number;
    retention_pct: number;
    avg_laundries: number;
  }>;
  churn_trend: Array<{
    month: string;
    churned: number;
    churn_rate: number;
  }>;
  retention_by_plan: Array<{
    plan: string;
    total: number;
    active: number;
    retention_pct: number;
  }> | null;
}

export function RetentionDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-retention-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_admin_retention_metrics');
      if (error) throw error;
      return data as unknown as RetentionMetrics;
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getRetentionColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-500';
    if (pct >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getRetentionBgColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500/20';
    if (pct >= 60) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">LTV Moyen</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(metrics?.avg_ltv || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Valeur vie client moyenne
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Durée Moyenne</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {Math.round(metrics?.avg_subscription_duration_days || 0)} j
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Durée d'abonnement moyenne
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux de Rétention</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className={`text-2xl font-bold ${getRetentionColor(metrics?.overall_retention_rate || 0)}`}>
                {metrics?.overall_retention_rate || 0}%
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Abonnés toujours actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Trial</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-blue-500">
                {metrics?.trial_conversion_rate || 0}%
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Essais convertis en payant
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Total LTV */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              LTV Total
            </CardTitle>
            <CardDescription>Revenu total généré par les abonnements</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-32" />
            ) : (
              <div className="text-4xl font-bold text-emerald-600">
                {formatCurrency(metrics?.total_ltv || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retention by Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Rétention par Plan</CardTitle>
            <CardDescription>Comparaison mensuel vs annuel</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[100px] w-full" />
            ) : metrics?.retention_by_plan?.length ? (
              <div className="space-y-4">
                {metrics.retention_by_plan.map((plan) => (
                  <div key={plan.plan} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{plan.plan}</span>
                      <Badge variant={plan.retention_pct >= 80 ? 'default' : plan.retention_pct >= 60 ? 'secondary' : 'destructive'}>
                        {plan.retention_pct}%
                      </Badge>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          plan.retention_pct >= 80 ? 'bg-emerald-500' : 
                          plan.retention_pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${plan.retention_pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.active} actifs / {plan.total} total
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cohort Table */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse de Cohortes</CardTitle>
          <CardDescription>Rétention par mois de démarrage (6 derniers mois)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : metrics?.cohorts?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohorte</TableHead>
                  <TableHead className="text-right">Démarrés</TableHead>
                  <TableHead className="text-right">Actifs</TableHead>
                  <TableHead className="text-right">Churned</TableHead>
                  <TableHead className="text-right">Rétention</TableHead>
                  <TableHead className="text-right">Laveries moy.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.cohorts.map((cohort) => (
                  <TableRow key={cohort.cohort_month}>
                    <TableCell className="font-medium">
                      {format(new Date(cohort.cohort_month), 'MMMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">{cohort.total_started}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {cohort.still_active}
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      {cohort.churned}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant="outline" 
                        className={`${getRetentionBgColor(cohort.retention_pct)} ${getRetentionColor(cohort.retention_pct)}`}
                      >
                        {cohort.retention_pct}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{cohort.avg_laundries}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune donnée de cohorte disponible</p>
          )}
        </CardContent>
      </Card>

      {/* Churn Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution du Churn</CardTitle>
          <CardDescription>Désabonnements mensuels (6 derniers mois)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : metrics?.churn_trend?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.churn_trend.map(item => ({
                ...item,
                month: format(new Date(item.month), 'MMM', { locale: fr })
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'churned' ? value : `${value}%`,
                    name === 'churned' ? 'Churned' : 'Taux'
                  ]}
                />
                <Bar dataKey="churned" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]}>
                  {metrics.churn_trend.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="hsl(var(--destructive))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Aucun churn enregistré sur la période
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
