import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, TrendingDown, Building2, Download, FileSpreadsheet } from "lucide-react";
import { useSites } from "@/hooks/useSites";
import { useMultipleSitesCosts } from "@/hooks/useSiteCosts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { format, differenceInDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "sonner";
import { 
  exportProfitabilityComparisonPDF, 
  exportProfitabilityComparisonCSV,
  type ProfitabilitySiteData 
} from "@/utils/comparisonExport";

interface MultiSiteProfitabilityComparisonProps {
  dateRange?: DateRange;
}

interface SiteStats {
  siteId: string;
  siteName: string;
  city: string;
  revenue: number;
  transactions: number;
  costs: number;
  profit: number;
  margin: number;
}

const chartConfig = {
  revenue: { label: "CA", color: "hsl(var(--primary))" },
  costs: { label: "Charges", color: "hsl(var(--chart-cb))" },
  profit: { label: "Bénéfice", color: "hsl(var(--chart-seche))" },
};

export function MultiSiteProfitabilityComparison({ dateRange }: MultiSiteProfitabilityComparisonProps) {
  const { t } = useTranslation("app");
  const { user } = useAuth();
  const { sites, isLoading: sitesLoading } = useSites();
  
  const siteIds = useMemo(() => sites.map(s => s.id), [sites]);
  const { data: costsMap, isLoading: costsLoading } = useMultipleSitesCosts(siteIds);

  // Fetch revenue for all sites
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['multi-site-revenue', siteIds, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!user || siteIds.length === 0) return {};
      
      const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd');
      const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('operations')
        .select('site_id, price_cb, price_esp')
        .in('site_id', siteIds)
        .gte('operation_date', startDate)
        .lte('operation_date', endDate);
      
      if (error) throw error;
      
      // Aggregate by site
      const result: Record<string, { revenue: number; transactions: number }> = {};
      for (const op of (data || [])) {
        if (!result[op.site_id]) {
          result[op.site_id] = { revenue: 0, transactions: 0 };
        }
        result[op.site_id].revenue += (op.price_cb || 0) + (op.price_esp || 0);
        result[op.site_id].transactions += 1;
      }
      
      return result;
    },
    enabled: !!user && siteIds.length > 0,
  });

  const siteStats = useMemo((): SiteStats[] => {
    if (!sites.length || !costsMap || !revenueData) return [];
    
    // Calculate period in months
    let periodMonths = 1;
    if (dateRange?.from && dateRange?.to) {
      const days = differenceInDays(dateRange.to, dateRange.from) + 1;
      periodMonths = Math.max(1, days / 30);
    }

    return sites.map(site => {
      const costs = costsMap[site.id] || {
        fixed_rent: 850,
        fixed_lease: 450,
        fixed_subscriptions: 120,
        fixed_insurance: 85,
        fixed_cleaning: 200,
        fixed_other: 50,
        var_energy_water_percent: 12,
        var_detergent_percent: 3,
      };
      
      const siteRevenue = revenueData[site.id]?.revenue || 0;
      const siteTransactions = revenueData[site.id]?.transactions || 0;
      
      // Fixed costs prorated
      const fixedCosts = (
        (costs.fixed_rent || 0) +
        (costs.fixed_lease || 0) +
        (costs.fixed_subscriptions || 0) +
        (costs.fixed_insurance || 0) +
        (costs.fixed_cleaning || 0) +
        (costs.fixed_other || 0)
      ) * periodMonths;
      
      // Variable costs
      const variableCosts = siteRevenue * ((costs.var_energy_water_percent || 0) + (costs.var_detergent_percent || 0)) / 100;
      
      const totalCosts = fixedCosts + variableCosts;
      const profit = siteRevenue - totalCosts;
      const margin = siteRevenue > 0 ? (profit / siteRevenue) * 100 : 0;
      
      return {
        siteId: site.id,
        siteName: site.name,
        city: site.city || 'Non renseignée',
        revenue: siteRevenue,
        transactions: siteTransactions,
        costs: totalCosts,
        profit,
        margin,
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [sites, costsMap, revenueData, dateRange]);

  const isLoading = sitesLoading || costsLoading || revenueLoading;

  if (sites.length < 2) {
    return null; // Don't show comparison if only one site
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t("profitability.multiSiteComparison")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = siteStats.map(s => ({
    name: s.siteName.length > 15 ? s.siteName.substring(0, 15) + '...' : s.siteName,
    fullName: s.siteName,
    revenue: Math.round(s.revenue),
    costs: Math.round(s.costs),
    profit: Math.round(s.profit),
    margin: s.margin.toFixed(1),
  }));

  const bestSite = siteStats[0];
  const worstSite = siteStats[siteStats.length - 1];

  const handleExportPDF = () => {
    const exportData = {
      sites: siteStats.map(s => ({
        siteName: s.siteName,
        city: s.city,
        revenue: s.revenue,
        costs: s.costs,
        profit: s.profit,
        margin: s.margin,
      })),
      dateStart: dateRange?.from || new Date(new Date().setMonth(new Date().getMonth() - 1)),
      dateEnd: dateRange?.to || new Date(),
      periodDays: dateRange?.from && dateRange?.to 
        ? differenceInDays(dateRange.to, dateRange.from) + 1 
        : 30,
    };
    exportProfitabilityComparisonPDF(exportData, t);
    toast.success(t("profitability.pdfExported"));
  };

  const handleExportCSV = () => {
    const exportData = {
      sites: siteStats.map(s => ({
        siteName: s.siteName,
        city: s.city,
        revenue: s.revenue,
        costs: s.costs,
        profit: s.profit,
        margin: s.margin,
      })),
      dateStart: dateRange?.from || new Date(new Date().setMonth(new Date().getMonth() - 1)),
      dateEnd: dateRange?.to || new Date(),
      periodDays: dateRange?.from && dateRange?.to 
        ? differenceInDays(dateRange.to, dateRange.from) + 1 
        : 30,
    };
    exportProfitabilityComparisonCSV(exportData, t);
    toast.success(t("profitability.csvExported"));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {t("profitability.multiSiteComparison")}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">{t("profitability.bestPerformer")}</p>
              <p className="font-semibold text-green-600">{bestSite?.siteName}</p>
              <p className="text-xs text-green-600">+{Math.round(bestSite?.profit || 0).toLocaleString('fr-FR')} € ({bestSite?.margin.toFixed(1)}%)</p>
            </div>
          </div>
          {worstSite && worstSite.siteId !== bestSite?.siteId && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">{t("profitability.needsAttention")}</p>
                <p className="font-semibold text-amber-600">{worstSite.siteName}</p>
                <p className="text-xs text-amber-600">{Math.round(worstSite.profit).toLocaleString('fr-FR')} € ({worstSite.margin.toFixed(1)}%)</p>
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis type="number" tickFormatter={(v) => `${v.toLocaleString('fr-FR')} €`} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold">{data.fullName}</p>
                      <p className="text-sm text-muted-foreground">CA: {data.revenue.toLocaleString('fr-FR')} €</p>
                      <p className="text-sm text-muted-foreground">Charges: {data.costs.toLocaleString('fr-FR')} €</p>
                      <p className="text-sm font-medium" style={{ color: data.profit >= 0 ? 'hsl(var(--chart-seche))' : 'hsl(var(--destructive))' }}>
                        Bénéfice: {data.profit.toLocaleString('fr-FR')} € ({data.margin}%)
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              <Bar dataKey="revenue" name="CA" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="costs" name="Charges" fill="hsl(var(--chart-cb))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="profit" name="Bénéfice" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.profit >= 0 ? "hsl(var(--chart-seche))" : "hsl(var(--destructive))"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Table details */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">{t("profitability.site")}</th>
                <th className="text-right py-2 font-medium text-muted-foreground">{t("profitability.revenue")}</th>
                <th className="text-right py-2 font-medium text-muted-foreground">{t("profitability.totalCosts")}</th>
                <th className="text-right py-2 font-medium text-muted-foreground">{t("profitability.netProfit")}</th>
                <th className="text-right py-2 font-medium text-muted-foreground">{t("profitability.margin")}</th>
              </tr>
            </thead>
            <tbody>
              {siteStats.map((site, idx) => (
                <tr key={site.siteId} className="border-b last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Badge variant="default" className="text-xs">🏆</Badge>}
                      <div>
                        <p className="font-medium">{site.siteName}</p>
                        <p className="text-xs text-muted-foreground">{site.city}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 font-medium">{Math.round(site.revenue).toLocaleString('fr-FR')} €</td>
                  <td className="text-right py-3 text-muted-foreground">{Math.round(site.costs).toLocaleString('fr-FR')} €</td>
                  <td className={`text-right py-3 font-bold ${site.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {site.profit >= 0 ? '+' : ''}{Math.round(site.profit).toLocaleString('fr-FR')} €
                  </td>
                  <td className="text-right py-3">
                    <Badge variant={site.margin >= 30 ? "default" : site.margin >= 15 ? "secondary" : "destructive"}>
                      {site.margin.toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
