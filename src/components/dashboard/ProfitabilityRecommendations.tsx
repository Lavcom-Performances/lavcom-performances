import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock,
  Zap,
  DollarSign,
  Target,
  ArrowRight
} from "lucide-react";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { useSiteCosts } from "@/hooks/useSiteCosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth, addMonths } from "date-fns";

interface Recommendation {
  id: string;
  type: "success" | "warning" | "danger" | "info";
  icon: React.ReactNode;
  title: string;
  description: string;
  impact: string;
  priority: "high" | "medium" | "low";
}

export function ProfitabilityRecommendations() {
  const { t } = useTranslation("app");
  const { user } = useAuth();
  const { currentSiteId } = useCurrentSite();
  const { costs, hasCosts, isLoading: costsLoading } = useSiteCosts(currentSiteId);

  // Fetch last 12 months of data
  const { data: historicalData, isLoading: dataLoading } = useQuery({
    queryKey: ['profitability-recommendations-data', currentSiteId],
    queryFn: async () => {
      if (!user || !currentSiteId) return null;
      
      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(new Date(), 11));
      
      const { data, error } = await supabase
        .from('operations')
        .select('operation_date, operation_time, price_cb, price_esp, machine')
        .eq('site_id', currentSiteId)
        .gte('operation_date', format(startDate, 'yyyy-MM-dd'))
        .lte('operation_date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Aggregate by month and compute various metrics
      const monthlyData: Record<string, { revenue: number; transactions: number; cbRevenue: number; espRevenue: number }> = {};
      const hourlyData: Record<number, number> = {};
      const machineData: Record<string, number> = {};
      
      for (const op of (data || [])) {
        const monthKey = op.operation_date.substring(0, 7);
        const revenue = (op.price_cb || 0) + (op.price_esp || 0);
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, transactions: 0, cbRevenue: 0, espRevenue: 0 };
        }
        monthlyData[monthKey].revenue += revenue;
        monthlyData[monthKey].transactions += 1;
        monthlyData[monthKey].cbRevenue += op.price_cb || 0;
        monthlyData[monthKey].espRevenue += op.price_esp || 0;
        
        // Hourly distribution
        if (op.operation_time) {
          const hour = parseInt(op.operation_time.split(':')[0], 10);
          if (!isNaN(hour)) {
            hourlyData[hour] = (hourlyData[hour] || 0) + revenue;
          }
        }
        
        // Machine performance
        if (op.machine) {
          machineData[op.machine] = (machineData[op.machine] || 0) + revenue;
        }
      }
      
      return { monthlyData, hourlyData, machineData };
    },
    enabled: !!user && !!currentSiteId,
  });

  const recommendations = useMemo((): Recommendation[] => {
    if (!historicalData || !hasCosts) return [];
    
    const recs: Recommendation[] = [];
    const { monthlyData, hourlyData, machineData } = historicalData;
    
    // Monthly fixed costs
    const monthlyFixedCosts = 
      (costs.fixed_rent || 0) +
      (costs.fixed_lease || 0) +
      (costs.fixed_subscriptions || 0) +
      (costs.fixed_insurance || 0) +
      (costs.fixed_cleaning || 0) +
      (costs.fixed_other || 0);
    
    const varPercent = ((costs.var_energy_water_percent || 0) + (costs.var_detergent_percent || 0)) / 100;
    
    // Get sorted months
    const months = Object.keys(monthlyData).sort();
    const recentMonths = months.slice(-6);
    
    if (recentMonths.length < 3) return recs;
    
    // Calculate trend
    const recentRevenues = recentMonths.map(m => monthlyData[m].revenue);
    const avgRevenue = recentRevenues.reduce((a, b) => a + b, 0) / recentRevenues.length;
    const lastMonthRevenue = recentRevenues[recentRevenues.length - 1] || 0;
    const prevMonthRevenue = recentRevenues[recentRevenues.length - 2] || 0;
    
    // Calculate profit
    const lastMonthCosts = monthlyFixedCosts + (lastMonthRevenue * varPercent);
    const lastMonthProfit = lastMonthRevenue - lastMonthCosts;
    const profitMargin = lastMonthRevenue > 0 ? (lastMonthProfit / lastMonthRevenue) * 100 : 0;
    
    // Revenue trend analysis
    const monthlyGrowth = prevMonthRevenue > 0 
      ? ((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
      : 0;
    
    // Linear regression for trend
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = recentRevenues.length;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentRevenues[i];
      sumXY += i * recentRevenues[i];
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trendDirection = slope > avgRevenue * 0.02 ? 'up' : slope < -avgRevenue * 0.02 ? 'down' : 'stable';
    
    // Recommendation 1: Profit margin
    if (profitMargin < 10) {
      recs.push({
        id: 'low-margin',
        type: 'danger',
        icon: <AlertTriangle className="h-5 w-5" />,
        title: t("profitability.recommendations.lowMargin.title"),
        description: t("profitability.recommendations.lowMargin.description"),
        impact: t("profitability.recommendations.lowMargin.impact"),
        priority: 'high'
      });
    } else if (profitMargin >= 10 && profitMargin < 20) {
      recs.push({
        id: 'moderate-margin',
        type: 'warning',
        icon: <Target className="h-5 w-5" />,
        title: t("profitability.recommendations.moderateMargin.title"),
        description: t("profitability.recommendations.moderateMargin.description"),
        impact: t("profitability.recommendations.moderateMargin.impact"),
        priority: 'medium'
      });
    } else if (profitMargin >= 30) {
      recs.push({
        id: 'excellent-margin',
        type: 'success',
        icon: <TrendingUp className="h-5 w-5" />,
        title: t("profitability.recommendations.excellentMargin.title"),
        description: t("profitability.recommendations.excellentMargin.description"),
        impact: t("profitability.recommendations.excellentMargin.impact"),
        priority: 'low'
      });
    }
    
    // Recommendation 2: Revenue trend
    if (trendDirection === 'down') {
      recs.push({
        id: 'declining-revenue',
        type: 'warning',
        icon: <TrendingDown className="h-5 w-5" />,
        title: t("profitability.recommendations.decliningRevenue.title"),
        description: t("profitability.recommendations.decliningRevenue.description"),
        impact: t("profitability.recommendations.decliningRevenue.impact"),
        priority: 'high'
      });
    } else if (trendDirection === 'up') {
      recs.push({
        id: 'growing-revenue',
        type: 'success',
        icon: <TrendingUp className="h-5 w-5" />,
        title: t("profitability.recommendations.growingRevenue.title"),
        description: t("profitability.recommendations.growingRevenue.description"),
        impact: t("profitability.recommendations.growingRevenue.impact"),
        priority: 'low'
      });
    }
    
    // Recommendation 3: Peak hours optimization
    const hourlyEntries = Object.entries(hourlyData);
    if (hourlyEntries.length > 0) {
      const sortedHours = hourlyEntries.sort((a, b) => b[1] - a[1]);
      const peakHours = sortedHours.slice(0, 3).map(([h]) => parseInt(h, 10));
      const offPeakRevenue = sortedHours.slice(-5).reduce((sum, [, v]) => sum + v, 0);
      const peakRevenue = sortedHours.slice(0, 5).reduce((sum, [, v]) => sum + v, 0);
      
      if (peakRevenue > offPeakRevenue * 3) {
        recs.push({
          id: 'peak-concentration',
          type: 'info',
          icon: <Clock className="h-5 w-5" />,
          title: t("profitability.recommendations.peakConcentration.title"),
          description: t("profitability.recommendations.peakConcentration.description", { 
            hours: peakHours.map(h => `${h}h`).join(', ') 
          }),
          impact: t("profitability.recommendations.peakConcentration.impact"),
          priority: 'medium'
        });
      }
    }
    
    // Recommendation 4: Variable costs optimization
    const totalVarPercent = (costs.var_energy_water_percent || 0) + (costs.var_detergent_percent || 0);
    if (totalVarPercent > 18) {
      recs.push({
        id: 'high-var-costs',
        type: 'warning',
        icon: <Zap className="h-5 w-5" />,
        title: t("profitability.recommendations.highVarCosts.title"),
        description: t("profitability.recommendations.highVarCosts.description", { percent: totalVarPercent.toFixed(1) }),
        impact: t("profitability.recommendations.highVarCosts.impact"),
        priority: 'medium'
      });
    }
    
    // Recommendation 5: Fixed costs analysis
    if (monthlyFixedCosts > avgRevenue * 0.6) {
      recs.push({
        id: 'high-fixed-costs',
        type: 'danger',
        icon: <DollarSign className="h-5 w-5" />,
        title: t("profitability.recommendations.highFixedCosts.title"),
        description: t("profitability.recommendations.highFixedCosts.description"),
        impact: t("profitability.recommendations.highFixedCosts.impact"),
        priority: 'high'
      });
    }
    
    // Recommendation 6: Machine performance (if we have data)
    const machineEntries = Object.entries(machineData);
    if (machineEntries.length >= 3) {
      const avgMachineRevenue = machineEntries.reduce((sum, [, v]) => sum + v, 0) / machineEntries.length;
      const underperformingMachines = machineEntries.filter(([, v]) => v < avgMachineRevenue * 0.5);
      
      if (underperformingMachines.length > 0) {
        recs.push({
          id: 'underperforming-machines',
          type: 'info',
          icon: <Target className="h-5 w-5" />,
          title: t("profitability.recommendations.underperformingMachines.title"),
          description: t("profitability.recommendations.underperformingMachines.description", { 
            count: underperformingMachines.length 
          }),
          impact: t("profitability.recommendations.underperformingMachines.impact"),
          priority: 'medium'
        });
      }
    }
    
    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [historicalData, costs, hasCosts, t]);

  const isLoading = costsLoading || dataLoading;

  if (!hasCosts) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t("profitability.recommendations.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t("profitability.recommendations.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            {t("profitability.recommendations.noData")}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTypeStyles = (type: Recommendation['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      case 'danger':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    }
  };

  const getIconColor = (type: Recommendation['type']) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-amber-600';
      case 'danger': return 'text-red-600';
      case 'info': return 'text-blue-600';
    }
  };

  const getPriorityBadge = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">{t("profitability.recommendations.priorityHigh")}</Badge>;
      case 'medium':
        return <Badge variant="secondary">{t("profitability.recommendations.priorityMedium")}</Badge>;
      case 'low':
        return <Badge variant="outline">{t("profitability.recommendations.priorityLow")}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          {t("profitability.recommendations.title")}
          <Badge variant="secondary" className="ml-2">
            {recommendations.length} {t("profitability.recommendations.count")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec) => (
          <div 
            key={rec.id} 
            className={`p-4 rounded-lg border ${getTypeStyles(rec.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${getIconColor(rec.type)}`}>
                {rec.icon}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-foreground">{rec.title}</h4>
                  {getPriorityBadge(rec.priority)}
                </div>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
                <div className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">{rec.impact}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
