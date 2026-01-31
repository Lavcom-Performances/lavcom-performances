import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useMonthlyRevenueRange } from "@/hooks/useAnalyticsRpc";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

interface MonthlyRevenueChartProps {
  startDate?: Date;
  endDate?: Date;
}

export function MonthlyRevenueChart({ startDate, endDate }: MonthlyRevenueChartProps) {
  const { currentSiteId } = useCurrentSite();
  
  const startStr = startDate ? format(startDate, "yyyy-MM-dd") : "";
  const endStr = endDate ? format(endDate, "yyyy-MM-dd") : "";
  
  const { data: rawData, isLoading } = useMonthlyRevenueRange(
    currentSiteId ?? "", 
    startStr, 
    endStr
  );

  const chartData = rawData?.map((item: any) => ({
    label: `${MONTH_NAMES[item.month - 1]} ${item.year}`,
    month: item.month,
    year: item.year,
    revenue: Number(item.revenue_total) || 0,
  })) ?? [];

  const dateRangeLabel = startDate && endDate 
    ? `${format(startDate, "MMM yyyy", { locale: fr })} - ${format(endDate, "MMM yyyy", { locale: fr })}`
    : "";

  if (isLoading) {
    return (
      <div className="dashboard-card h-[360px]">
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">CA par mois</h3>
        </div>
        <Skeleton className="h-[280px] w-full" />
      </div>
    );
  }

  if (!startDate || !endDate) {
    return (
      <div className="dashboard-card h-[360px]">
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">CA par mois</h3>
        </div>
        <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
          Sélectionnez une plage de dates
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="dashboard-card h-[360px]">
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">CA par mois</h3>
        </div>
        <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div data-pdf-chart="monthly-revenue" className="dashboard-card h-[360px]">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">CA par mois</h3>
        {dateRangeLabel && (
          <span className="text-xs text-muted-foreground">{dateRangeLabel}</span>
        )}
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}€`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value.toFixed(2)} €`, "CA"]}
            />
            <Bar 
              dataKey="revenue" 
              name="CA" 
              fill="hsl(var(--lavcom-green))"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
