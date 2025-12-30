import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMonthlyRevenue } from "@/hooks/useAnalyticsRpc";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { Skeleton } from "@/components/ui/skeleton";

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

interface MonthlyRevenueChartProps {
  year?: number;
}

export function MonthlyRevenueChart({ year = new Date().getFullYear() }: MonthlyRevenueChartProps) {
  const { currentSiteId } = useCurrentSite();
  const { data: rawData, isLoading } = useMonthlyRevenue(currentSiteId ?? "", year);

  const chartData = rawData?.map((item) => ({
    month: MONTH_NAMES[item.month - 1] || `M${item.month}`,
    revenue: Number(item.revenue_total) || 0,
  })) ?? [];

  if (isLoading) {
    return (
      <div className="kpi-card h-[400px]">
        <h3 className="font-display font-semibold text-lg mb-4">CA par mois</h3>
        <Skeleton className="h-[340px] w-full" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="kpi-card h-[400px]">
        <h3 className="font-display font-semibold text-lg mb-4">CA par mois</h3>
        <div className="flex items-center justify-center h-[340px] text-muted-foreground">
          Aucune donnée disponible pour {year}
        </div>
      </div>
    );
  }

  return (
    <div data-pdf-chart="monthly-revenue" className="kpi-card h-[400px]">
      <h3 className="font-display font-semibold text-lg mb-4">CA par mois ({year})</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `${value}€`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value.toFixed(2)} €`, "CA"]}
          />
          <Bar 
            dataKey="revenue" 
            name="CA" 
            fill="hsl(var(--lavcom-green))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}