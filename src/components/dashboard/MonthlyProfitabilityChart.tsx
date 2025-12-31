import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Download } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { useProfitability } from "@/hooks/useProfitability";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteCosts } from "@/hooks/useSiteCosts";
import { useSites } from "@/hooks/useSites";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { fr, enUS, de, es, it, nl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { generateProfitabilityChartPdf } from "@/utils/profitabilityChartPdfExport";

const chartConfig = {
  revenue: { label: "CA", color: "hsl(var(--primary))" },
  costs: { label: "Charges", color: "hsl(var(--destructive))" },
  profit: { label: "Bénéfice", color: "hsl(var(--chart-seche))" },
};

export function MonthlyProfitabilityChart() {
  const { t, i18n } = useTranslation("app");
  const { currentSiteId } = useCurrentSite();
  const { costs, hasCosts } = useSiteCosts(currentSiteId);
  const { sites } = useSites();
  const currentSite = sites?.find(s => s.id === currentSiteId);
  const profitability = useProfitability();

  // Get locale for date formatting
  const getLocale = () => {
    switch (i18n.language) {
      case "fr": return fr;
      case "de": return de;
      case "es": return es;
      case "it": return it;
      case "nl": return nl;
      default: return enUS;
    }
  };

  // Fetch last 12 months of data
  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ["monthlyProfitability", currentSiteId, costs],
    queryFn: async () => {
      if (!currentSiteId) return [];

      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(endDate, 11));
      
      const { data, error } = await supabase
        .from("operations")
        .select("operation_date, price_cb, price_esp")
        .eq("site_id", currentSiteId)
        .gte("operation_date", format(startDate, "yyyy-MM-dd"))
        .lte("operation_date", format(endDate, "yyyy-MM-dd"));

      if (error) throw error;

      // Generate all months in range
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      
      // Group revenue by month
      const revenueByMonth = new Map<string, number>();
      (data || []).forEach((op) => {
        const monthKey = format(new Date(op.operation_date), "yyyy-MM");
        const revenue = Number(op.price_cb || 0) + Number(op.price_esp || 0);
        revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + revenue);
      });

      // Calculate monthly fixed costs
      const monthlyFixedCosts = 
        (costs.fixed_rent || 0) +
        (costs.fixed_lease || 0) +
        (costs.fixed_subscriptions || 0) +
        (costs.fixed_insurance || 0) +
        (costs.fixed_cleaning || 0) +
        (costs.fixed_other || 0);

      // Build chart data
      return months.map((month) => {
        const monthKey = format(month, "yyyy-MM");
        const revenue = revenueByMonth.get(monthKey) || 0;
        
        // Variable costs as percentage of revenue
        const energyWaterCost = revenue * ((costs.var_energy_water_percent || 0) / 100);
        const detergentCost = revenue * ((costs.var_detergent_percent || 0) / 100);
        const variableCosts = energyWaterCost + detergentCost;
        
        const totalCosts = monthlyFixedCosts + variableCosts;
        const profit = revenue - totalCosts;

        return {
          month: format(month, "MMM yy", { locale: getLocale() }),
          fullMonth: format(month, "MMMM yyyy", { locale: getLocale() }),
          revenue: Math.round(revenue),
          costs: Math.round(totalCosts),
          profit: Math.round(profit),
        };
      });
    },
    enabled: !!currentSiteId && hasCosts,
  });

  if (!hasCosts) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const handleExportPdf = () => {
    if (!monthlyData || monthlyData.length === 0) {
      toast.error(t("profitability.exportNoData"));
      return;
    }

    try {
      generateProfitabilityChartPdf({
        siteName: currentSite?.name || "-",
        address: currentSite?.address || "-",
        generatedDate: format(new Date(), "dd/MM/yyyy HH:mm"),
        monthlyData,
        avgMonthlyRevenue: Math.round(monthlyData.reduce((acc, d) => acc + d.revenue, 0) / monthlyData.length),
        avgMonthlyCosts: Math.round(monthlyData.reduce((acc, d) => acc + d.costs, 0) / monthlyData.length),
        avgMonthlyProfit: Math.round(monthlyData.reduce((acc, d) => acc + d.profit, 0) / monthlyData.length),
        currentProfitMargin: profitability.profitMargin,
      }, t);
      toast.success(t("profitability.exportSuccess"));
    } catch (error) {
      toast.error(t("profitability.exportError"));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t("profitability.monthlyEvolution")}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleExportPdf}>
          <Download className="h-4 w-4 mr-2" />
          {t("profitability.exportPdf")}
        </Button>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-seche))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-seche))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={(value) => `${value} €`}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        revenue: t("profitability.revenue"),
                        costs: t("profitability.totalCosts"),
                        profit: t("profitability.netProfit"),
                      };
                      return (
                        <span>
                          {labels[name as string] || name}: <strong>{Number(value).toLocaleString()} €</strong>
                        </span>
                      );
                    }}
                  />
                }
              />
              <Legend 
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    revenue: t("profitability.revenue"),
                    costs: t("profitability.totalCosts"),
                    profit: t("profitability.netProfit"),
                  };
                  return labels[value] || value;
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
              <Area
                type="monotone"
                dataKey="costs"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                fill="none"
                strokeDasharray="5 5"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="hsl(var(--chart-seche))"
                strokeWidth={2}
                fill="url(#colorProfit)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Summary stats */}
        {monthlyData && monthlyData.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">{t("profitability.avgMonthlyRevenue")}</p>
              <p className="text-lg font-bold text-foreground">
                {Math.round(monthlyData.reduce((acc, d) => acc + d.revenue, 0) / monthlyData.length).toLocaleString()} €
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">{t("profitability.avgMonthlyCosts")}</p>
              <p className="text-lg font-bold text-amber-600">
                {Math.round(monthlyData.reduce((acc, d) => acc + d.costs, 0) / monthlyData.length).toLocaleString()} €
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">{t("profitability.avgMonthlyProfit")}</p>
              <p className={`text-lg font-bold ${
                monthlyData.reduce((acc, d) => acc + d.profit, 0) >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {Math.round(monthlyData.reduce((acc, d) => acc + d.profit, 0) / monthlyData.length).toLocaleString()} €
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
