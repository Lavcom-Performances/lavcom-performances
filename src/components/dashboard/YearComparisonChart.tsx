import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMonthlyRevenueRange } from "@/hooks/useAnalyticsRpc";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfYear, endOfYear } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

// Generate available years (last 10 years)
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = 0; i < 10; i++) {
    years.push(currentYear - i);
  }
  return years;
};

const YEAR_OPTIONS = generateYearOptions();

export function YearComparisonChart() {
  const { currentSiteId } = useCurrentSite();
  const currentCalendarYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentCalendarYear);
  const [comparisonYear, setComparisonYear] = useState(currentCalendarYear - 1);
  
  const currentYear = selectedYear;
  const previousYear = comparisonYear;
  
  // Fetch current year data
  const currentYearStart = format(startOfYear(new Date(currentYear, 0, 1)), "yyyy-MM-dd");
  const currentYearEnd = format(endOfYear(new Date(currentYear, 0, 1)), "yyyy-MM-dd");
  
  // Fetch previous year data
  const previousYearStart = format(startOfYear(new Date(previousYear, 0, 1)), "yyyy-MM-dd");
  const previousYearEnd = format(endOfYear(new Date(previousYear, 0, 1)), "yyyy-MM-dd");
  
  const { data: currentData, isLoading: isLoadingCurrent } = useMonthlyRevenueRange(
    currentSiteId ?? "", 
    currentYearStart, 
    currentYearEnd
  );
  
  const { data: previousData, isLoading: isLoadingPrevious } = useMonthlyRevenueRange(
    currentSiteId ?? "", 
    previousYearStart, 
    previousYearEnd
  );

  const isLoading = isLoadingCurrent || isLoadingPrevious;

  // Merge data for comparison
  const chartData = useMemo(() => {
    const merged: { month: string; monthNum: number; current: number; previous: number }[] = [];
    
    for (let i = 1; i <= 12; i++) {
      const currentMonth = currentData?.find((d: any) => d.month === i);
      const previousMonth = previousData?.find((d: any) => d.month === i);
      
      merged.push({
        month: MONTH_NAMES[i - 1],
        monthNum: i,
        current: currentMonth ? Number(currentMonth.revenue_total) || 0 : 0,
        previous: previousMonth ? Number(previousMonth.revenue_total) || 0 : 0,
      });
    }
    
    return merged;
  }, [currentData, previousData]);

  // Calculate totals and variation
  const stats = useMemo(() => {
    const currentTotal = chartData.reduce((sum, item) => sum + item.current, 0);
    const previousTotal = chartData.reduce((sum, item) => sum + item.previous, 0);
    const variation = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal) * 100 
      : 0;
    
    return { currentTotal, previousTotal, variation };
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="kpi-card h-[450px]">
        <h3 className="font-display font-semibold text-lg mb-4">Comparaison annuelle</h3>
        <Skeleton className="h-[390px] w-full" />
      </div>
    );
  }

  const hasData = chartData.some(d => d.current > 0 || d.previous > 0);

  if (!hasData) {
    return (
      <div className="kpi-card h-[450px]">
        <h3 className="font-display font-semibold text-lg mb-4">Comparaison annuelle</h3>
        <div className="flex items-center justify-center h-[390px] text-muted-foreground">
          Aucune donnée disponible pour la comparaison
        </div>
      </div>
    );
  }

  const VariationIcon = stats.variation > 0 ? TrendingUp : stats.variation < 0 ? TrendingDown : Minus;
  const variationColor = stats.variation > 0 ? "text-green-500" : stats.variation < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <div data-pdf-chart="year-comparison" className="kpi-card h-[450px]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-display font-semibold text-lg">Comparaison</h3>
          <div className="flex items-center gap-2">
            <Select
              value={comparisonYear.toString()}
              onValueChange={(value) => setComparisonYear(parseInt(value))}
            >
              <SelectTrigger className="w-[90px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.filter(y => y !== selectedYear).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">vs</span>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[90px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.filter(y => y !== comparisonYear).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className="font-normal text-muted-foreground">{previousYear}:</span>
            <span className="font-semibold">{stats.previousTotal.toLocaleString("fr-FR")} €</span>
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <span className="font-normal text-muted-foreground">{currentYear}:</span>
            <span className="font-semibold">{stats.currentTotal.toLocaleString("fr-FR")} €</span>
          </Badge>
          <Badge 
            variant={stats.variation >= 0 ? "default" : "destructive"} 
            className={`gap-1 ${stats.variation >= 0 ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" : ""}`}
          >
            <VariationIcon className="h-3.5 w-3.5" />
            {stats.variation >= 0 ? "+" : ""}{stats.variation.toFixed(1)}%
          </Badge>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string) => [
              `${value.toLocaleString("fr-FR")} €`, 
              name === "previous" ? previousYear : currentYear
            ]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend 
            formatter={(value) => value === "previous" ? previousYear : currentYear}
          />
          <Line
            type="monotone"
            dataKey="previous"
            name="previous"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: "hsl(var(--muted-foreground))", r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="current"
            name="current"
            stroke="hsl(var(--lavcom-green))"
            strokeWidth={3}
            dot={{ fill: "hsl(var(--lavcom-green))", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
