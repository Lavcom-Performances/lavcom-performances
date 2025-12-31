import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Sparkles, AlertTriangle } from "lucide-react";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { useSiteCosts } from "@/hooks/useSiteCosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

interface MonthlyData {
  month: string;
  monthLabel: string;
  revenue: number;
  costs: number;
  profit: number;
  isForecast: boolean;
}

const chartConfig = {
  profit: { label: "Bénéfice", color: "hsl(var(--primary))" },
  forecast: { label: "Prévision", color: "hsl(var(--chart-cb))" },
};

export function ProfitabilityForecast() {
  const { t } = useTranslation("app");
  const { user } = useAuth();
  const { currentSiteId } = useCurrentSite();
  const { costs, hasCosts, isLoading: costsLoading } = useSiteCosts(currentSiteId);

  // Fetch last 12 months of data
  const { data: historicalData, isLoading: dataLoading } = useQuery({
    queryKey: ['profitability-history', currentSiteId],
    queryFn: async () => {
      if (!user || !currentSiteId) return [];
      
      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(new Date(), 11));
      
      const { data, error } = await supabase
        .from('operations')
        .select('operation_date, price_cb, price_esp')
        .eq('site_id', currentSiteId)
        .gte('operation_date', format(startDate, 'yyyy-MM-dd'))
        .lte('operation_date', format(endDate, 'yyyy-MM-dd'));
      
      if (error) throw error;
      
      // Aggregate by month
      const monthlyRevenue: Record<string, number> = {};
      for (const op of (data || [])) {
        const monthKey = op.operation_date.substring(0, 7); // YYYY-MM
        if (!monthlyRevenue[monthKey]) monthlyRevenue[monthKey] = 0;
        monthlyRevenue[monthKey] += (op.price_cb || 0) + (op.price_esp || 0);
      }
      
      return monthlyRevenue;
    },
    enabled: !!user && !!currentSiteId,
  });

  const chartData = useMemo((): MonthlyData[] => {
    if (!historicalData || !hasCosts) return [];

    const result: MonthlyData[] = [];
    const now = new Date();
    
    // Monthly fixed costs
    const monthlyFixedCosts = 
      (costs.fixed_rent || 0) +
      (costs.fixed_lease || 0) +
      (costs.fixed_subscriptions || 0) +
      (costs.fixed_insurance || 0) +
      (costs.fixed_cleaning || 0) +
      (costs.fixed_other || 0);
    
    const varPercent = ((costs.var_energy_water_percent || 0) + (costs.var_detergent_percent || 0)) / 100;

    // Historical data (last 12 months)
    const revenues: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthKey = format(date, 'yyyy-MM');
      const revenue = historicalData[monthKey] || 0;
      revenues.push(revenue);
      
      const variableCosts = revenue * varPercent;
      const totalCosts = monthlyFixedCosts + variableCosts;
      
      result.push({
        month: monthKey,
        monthLabel: format(date, 'MMM yyyy', { locale: fr }),
        revenue,
        costs: totalCosts,
        profit: revenue - totalCosts,
        isForecast: false,
      });
    }

    // Calculate trend for forecasting (simple linear regression on last 6 months)
    const recentRevenues = revenues.slice(-6);
    const n = recentRevenues.length;
    
    if (n >= 3) {
      // Calculate slope and intercept
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += recentRevenues[i];
        sumXY += i * recentRevenues[i];
        sumX2 += i * i;
      }
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      // Apply seasonality factor (comparing to same month last year if available)
      const seasonalFactors: number[] = [];
      for (let i = 0; i < 3; i++) {
        const futureMonth = addMonths(now, i + 1);
        const sameMonthLastYear = format(subMonths(futureMonth, 12), 'yyyy-MM');
        const lastYearRevenue = historicalData[sameMonthLastYear];
        
        if (lastYearRevenue && lastYearRevenue > 0) {
          // Average of recent months
          const avgRecent = recentRevenues.reduce((a, b) => a + b, 0) / n;
          seasonalFactors.push(lastYearRevenue / avgRecent);
        } else {
          seasonalFactors.push(1);
        }
      }
      
      // Generate forecast for next 3 months
      for (let i = 1; i <= 3; i++) {
        const date = addMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        
        // Base forecast from linear regression
        let forecastRevenue = intercept + slope * (n + i - 1);
        
        // Apply seasonal adjustment
        forecastRevenue *= seasonalFactors[i - 1];
        
        // Ensure non-negative
        forecastRevenue = Math.max(0, forecastRevenue);
        
        const variableCosts = forecastRevenue * varPercent;
        const totalCosts = monthlyFixedCosts + variableCosts;
        
        result.push({
          month: monthKey,
          monthLabel: format(date, 'MMM yyyy', { locale: fr }),
          revenue: Math.round(forecastRevenue),
          costs: Math.round(totalCosts),
          profit: Math.round(forecastRevenue - totalCosts),
          isForecast: true,
        });
      }
    }

    return result;
  }, [historicalData, costs, hasCosts]);

  const forecastData = chartData.filter(d => d.isForecast);
  const avgForecastProfit = forecastData.length > 0 
    ? forecastData.reduce((a, b) => a + b.profit, 0) / forecastData.length 
    : 0;
  const lastHistoricalProfit = chartData.find(d => !d.isForecast && chartData.indexOf(d) === chartData.filter(x => !x.isForecast).length - 1)?.profit || 0;
  const trend = avgForecastProfit - lastHistoricalProfit;
  const trendPercent = lastHistoricalProfit !== 0 ? (trend / Math.abs(lastHistoricalProfit)) * 100 : 0;

  const isLoading = costsLoading || dataLoading;

  if (!hasCosts) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("profitability.forecast")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length < 6) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("profitability.forecast")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-muted-foreground">
              {t("profitability.insufficientDataForForecast")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t("profitability.forecast")}
          <Badge variant="secondary" className="ml-2">
            {t("profitability.next3Months")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trend summary */}
        <div className="flex flex-wrap gap-4">
          <div className={`flex items-center gap-2 p-3 rounded-lg ${trend >= 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            {trend >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">{t("profitability.expectedTrend")}</p>
              <p className={`font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? '+' : ''}{trendPercent.toFixed(1)}%
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t("profitability.avgForecastProfit")}</p>
              <p className="font-bold text-foreground">
                {Math.round(avgForecastProfit).toLocaleString('fr-FR')} €/mois
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-cb))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-cb))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10 }}
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload as MonthlyData;
                  return (
                    <div className="bg-popover border rounded-lg p-3 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold">{data.monthLabel}</p>
                        {data.isForecast && (
                          <Badge variant="secondary" className="text-xs">
                            {t("profitability.forecastLabel")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        CA: {data.revenue.toLocaleString('fr-FR')} €
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Charges: {data.costs.toLocaleString('fr-FR')} €
                      </p>
                      <p className={`text-sm font-medium ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Bénéfice: {data.profit >= 0 ? '+' : ''}{data.profit.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              
              {/* Historical line */}
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.isForecast) return null;
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={4} 
                      fill="hsl(var(--primary))" 
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
              />
              
              {/* Forecast area */}
              <Area
                type="monotone"
                dataKey={(d: MonthlyData) => d.isForecast ? d.profit : null}
                fill="url(#forecastGradient)"
                stroke="hsl(var(--chart-cb))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (!payload.isForecast) return null;
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={4} 
                      fill="hsl(var(--chart-cb))" 
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Forecast details */}
        <div className="grid grid-cols-3 gap-4">
          {forecastData.map((month) => (
            <div key={month.month} className="p-3 border rounded-lg bg-muted/30">
              <p className="text-sm font-medium text-muted-foreground capitalize">{month.monthLabel}</p>
              <p className={`text-lg font-bold ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {month.profit >= 0 ? '+' : ''}{Math.round(month.profit).toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-muted-foreground">
                CA: {Math.round(month.revenue).toLocaleString('fr-FR')} €
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground italic">
          {t("profitability.forecastDisclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}
