import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingDown, Users, Activity, Brain } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ChurnPrediction {
  user_id: string;
  email: string;
  company_name: string | null;
  plan_type: string;
  status: string;
  subscription_start: string | null;
  trial_end: string | null;
  laundry_count: number;
  days_active: number;
  days_until_trial_end: number | null;
  last_login: string | null;
  days_since_last_login: number;
  total_logins_30d: number;
  last_import: string | null;
  days_since_last_import: number;
  total_operations: number;
  sites_count: number;
  churn_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  risk_factors: string[];
}

const RISK_COLORS = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-green-500 text-white',
};

const RISK_LABELS = {
  critical: 'Critique',
  high: 'Élevé',
  medium: 'Moyen',
  low: 'Faible',
};

const PIE_COLORS = ['hsl(var(--destructive))', '#f97316', '#eab308', '#22c55e'];

export function ChurnPredictionsDashboard() {
  const { data: predictions, isLoading } = useQuery({
    queryKey: ['admin-churn-predictions'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_admin_churn_predictions');
      if (error) throw error;
      return (data as unknown as ChurnPrediction[]) || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const riskCounts = {
    critical: predictions?.filter(p => p.risk_level === 'critical').length || 0,
    high: predictions?.filter(p => p.risk_level === 'high').length || 0,
    medium: predictions?.filter(p => p.risk_level === 'medium').length || 0,
    low: predictions?.filter(p => p.risk_level === 'low').length || 0,
  };

  const pieData = [
    { name: 'Critique', value: riskCounts.critical, color: PIE_COLORS[0] },
    { name: 'Élevé', value: riskCounts.high, color: PIE_COLORS[1] },
    { name: 'Moyen', value: riskCounts.medium, color: PIE_COLORS[2] },
    { name: 'Faible', value: riskCounts.low, color: PIE_COLORS[3] },
  ].filter(d => d.value > 0);

  const avgChurnScore = predictions?.length 
    ? Math.round(predictions.reduce((sum, p) => sum + p.churn_score, 0) / predictions.length)
    : 0;

  const atRiskCount = (riskCounts.critical + riskCounts.high);
  const atRiskPct = predictions?.length ? Math.round((atRiskCount / predictions.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Prédictions de Churn (ML)</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total utilisateurs actifs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{predictions?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              À risque (critique + élevé)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{atRiskCount}</div>
            <div className="text-sm text-muted-foreground">{atRiskPct}% du total</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Score churn moyen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgChurnScore}/100</div>
            <Progress value={avgChurnScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Trials à risque
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {predictions?.filter(p => p.plan_type === 'trial' && (p.risk_level === 'critical' || p.risk_level === 'high')).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribution des risques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Répartition par niveau de risque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(riskCounts).map(([level, count]) => (
              <div key={level} className="flex items-center gap-4">
                <Badge className={RISK_COLORS[level as keyof typeof RISK_COLORS]}>
                  {RISK_LABELS[level as keyof typeof RISK_LABELS]}
                </Badge>
                <div className="flex-1">
                  <Progress 
                    value={predictions?.length ? (count / predictions.length) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Predictions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail des prédictions</CardTitle>
          <CardDescription>
            Classés par score de churn décroissant. Les facteurs de risque sont calculés en temps réel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Risque</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead>Connexions (30j)</TableHead>
                  <TableHead>Opérations</TableHead>
                  <TableHead>Facteurs de risque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictions?.slice(0, 50).map((p) => (
                  <TableRow key={p.user_id} className={p.risk_level === 'critical' ? 'bg-destructive/5' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{p.company_name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{p.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.plan_type === 'trial' ? 'outline' : 'secondary'}>
                        {p.plan_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{Math.round(p.churn_score)}</span>
                        <Progress value={p.churn_score} className="w-16 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={RISK_COLORS[p.risk_level]}>
                        {RISK_LABELS[p.risk_level]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.last_login 
                        ? `${Math.round(p.days_since_last_login)}j`
                        : 'Jamais'
                      }
                    </TableCell>
                    <TableCell>{p.total_logins_30d}</TableCell>
                    <TableCell>{p.total_operations.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {p.risk_factors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!predictions || predictions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Aucune prédiction disponible
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
