import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';

interface IntegrityTrendData {
  month: string;
  monthLabel: string;
  avgScore: number;
  reportCount: number;
  minScore: number;
  maxScore: number;
}

const chartConfig: ChartConfig = {
  avgScore: {
    label: 'Score moyen',
    color: 'hsl(var(--primary))',
  },
  minScore: {
    label: 'Score min',
    color: 'hsl(var(--muted-foreground))',
  },
  maxScore: {
    label: 'Score max',
    color: 'hsl(var(--accent-foreground))',
  },
};

export function ComplianceIntegrityTrendsChart() {
  // Fetch reports from the last 12 months
  const { data: reports, isLoading } = useQuery({
    queryKey: ['compliance-reports-trends'],
    queryFn: async () => {
      const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
      
      const { data, error } = await supabase
        .from('compliance_reports')
        .select('id, generated_at, integrity_score, period_label')
        .gte('generated_at', twelveMonthsAgo.toISOString())
        .order('generated_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Process data into monthly aggregates
  const trendData = useMemo<IntegrityTrendData[]>(() => {
    if (!reports || reports.length === 0) return [];

    const monthlyData: Record<string, { scores: number[]; count: number }> = {};

    // Initialize all 12 months
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthKey = format(month, 'yyyy-MM');
      monthlyData[monthKey] = { scores: [], count: 0 };
    }

    // Populate with actual data
    reports.forEach((report) => {
      const monthKey = format(new Date(report.generated_at), 'yyyy-MM');
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].scores.push(report.integrity_score);
        monthlyData[monthKey].count += 1;
      }
    });

    // Convert to array format
    return Object.entries(monthlyData).map(([monthKey, data]) => {
      const scores = data.scores;
      const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      const minScore = scores.length > 0 ? Math.min(...scores) : 0;
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

      const monthDate = new Date(monthKey + '-01');
      return {
        month: monthKey,
        monthLabel: format(monthDate, 'MMM yy', { locale: fr }),
        avgScore,
        reportCount: data.count,
        minScore,
        maxScore,
      };
    });
  }, [reports]);

  // Calculate trend
  const trend = useMemo(() => {
    const validData = trendData.filter(d => d.reportCount > 0);
    if (validData.length < 2) return { direction: 'stable' as const, value: 0 };
    
    const recent = validData.slice(-3);
    const earlier = validData.slice(-6, -3);
    
    if (recent.length === 0 || earlier.length === 0) return { direction: 'stable' as const, value: 0 };
    
    const recentAvg = recent.reduce((a, b) => a + b.avgScore, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b.avgScore, 0) / earlier.length;
    
    const diff = recentAvg - earlierAvg;
    
    if (diff > 2) return { direction: 'up' as const, value: Math.round(diff) };
    if (diff < -2) return { direction: 'down' as const, value: Math.round(Math.abs(diff)) };
    return { direction: 'stable' as const, value: 0 };
  }, [trendData]);

  // Current average
  const currentAvg = useMemo(() => {
    const validData = trendData.filter(d => d.reportCount > 0);
    if (validData.length === 0) return 0;
    return Math.round(validData.reduce((a, b) => a + b.avgScore, 0) / validData.length);
  }, [trendData]);

  const getTrendIcon = () => {
    if (trend.direction === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend.direction === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendText = () => {
    if (trend.direction === 'up') return `+${trend.value}% vs trimestre précédent`;
    if (trend.direction === 'down') return `-${trend.value}% vs trimestre précédent`;
    return 'Stable';
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = trendData.some(d => d.reportCount > 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Tendance des Scores d'Intégrité
            </CardTitle>
            <CardDescription>
              Évolution mensuelle sur les 12 derniers mois
            </CardDescription>
          </div>
          {hasData && (
            <div className="text-right">
              <p className={`text-3xl font-bold ${getScoreColor(currentAvg)}`}>
                {currentAvg}%
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                {getTrendIcon()}
                <span>{getTrendText()}</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune donnée disponible</p>
              <p className="text-sm">Les tendances apparaîtront après la génération de rapports</p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart 
              data={trendData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
                width={35}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, item) => {
                      const data = item.payload as IntegrityTrendData;
                      return (
                        <div className="space-y-1">
                          <p className="font-medium">Score moyen: {data.avgScore}%</p>
                          {data.reportCount > 0 && (
                            <>
                              <p className="text-xs text-muted-foreground">
                                Min: {data.minScore}% / Max: {data.maxScore}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {data.reportCount} rapport(s)
                              </p>
                            </>
                          )}
                        </div>
                      );
                    }}
                  />
                }
              />
              <ReferenceLine 
                y={95} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ 
                  value: '95%', 
                  position: 'right', 
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }}
              />
              <Area
                type="monotone"
                dataKey="avgScore"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#scoreGradient)"
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
