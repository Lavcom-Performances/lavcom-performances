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

  // Format date range for title
  const dateRangeLabel = startDate && endDate 
    ? `${format(startDate, "MMM yyyy", { locale: fr })} - ${format(endDate, "MMM yyyy", { locale: fr })}`
    : "";

  if (isLoading) {
    return (
      <div className="kpi-card h-[400px]">
        <h3 className="font-display font-semibold text-lg mb-4">CA par mois</h3>
        <Skeleton className="h-[340px] w-full" />
      </div>
    );
  }

  if (!startDate || !endDate) {
    return (
      <div className="kpi-card h-[400px]">
        <h3 className="font-display font-semibold text-lg mb-4">CA par mois</h3>
        <div className="flex items-center justify-center h-[340px] text-muted-foreground">
          Sélectionnez une plage de dates
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="kpi-card h-[400px]">
        <h3 className="font-display font-semibold text-lg mb-4">CA par mois</h3>
        <div className="flex items-center justify-center h-[340px] text-muted-foreground">
          Aucune donnée disponible pour cette période
        </div>
      </div>
    );
  }

  return (
    <div data-pdf-chart="monthly-revenue" className="kpi-card h-[400px]">
      <h3 className="font-display font-semibold text-lg mb-4">
        CA par mois {dateRangeLabel && <span className="text-muted-foreground font-normal text-sm">({dateRangeLabel})</span>}
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            angle={-45}
            textAnchor="end"
            height={60}
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
