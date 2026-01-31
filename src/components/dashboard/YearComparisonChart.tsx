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
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

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
  
  const currentYearStart = format(startOfYear(new Date(currentYear, 0, 1)), "yyyy-MM-dd");
  const currentYearEnd = format(endOfYear(new Date(currentYear, 0, 1)), "yyyy-MM-dd");
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
      <div className="dashboard-card h-[400px]">
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">Comparaison annuelle</h3>
        </div>
        <Skeleton className="h-[320px] w-full" />
      </div>
    );
  }

  const hasData = chartData.some(d => d.current > 0 || d.previous > 0);

  if (!hasData) {
    return (
      <div className="dashboard-card h-[400px]">
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">Comparaison annuelle</h3>
        </div>
        <div className="flex items-center justify-center h-[320px] text-sm text-muted-foreground">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  const VariationIcon = stats.variation > 0 ? TrendingUp : stats.variation < 0 ? TrendingDown : Minus;

  return (
    <div data-pdf-chart="year-comparison" className="dashboard-card h-[400px]">
      <div className="dashboard-card-header flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="dashboard-card-title">Comparaison</h3>
          <div className="flex items-center gap-1.5">
            <Select
              value={comparisonYear.toString()}
              onValueChange={(value) => setComparisonYear(parseInt(value))}
            >
              <SelectTrigger className="w-[80px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.filter(y => y !== selectedYear).map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">vs</span>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[80px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.filter(y => y !== comparisonYear).map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="gap-1 text-xs h-6">
            <span className="text-muted-foreground">{previousYear}:</span>
            <span className="font-semibold tabular-nums">{stats.previousTotal.toLocaleString("fr-FR")} €</span>
          </Badge>
          <Badge variant="secondary" className="gap-1 text-xs h-6">
            <span className="text-muted-foreground">{currentYear}:</span>
            <span className="font-semibold tabular-nums">{stats.currentTotal.toLocaleString("fr-FR")} €</span>
          </Badge>
          <Badge 
            variant={stats.variation >= 0 ? "default" : "destructive"} 
            className={`gap-1 text-xs h-6 ${stats.variation >= 0 ? "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400" : ""}`}
          >
            <VariationIcon className="h-3 w-3" />
            <span className="tabular-nums">{stats.variation >= 0 ? "+" : ""}{stats.variation.toFixed(1)}%</span>
          </Badge>
        </div>
      </div>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString("fr-FR")} €`, 
                name === "previous" ? previousYear : currentYear
              ]}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => value === "previous" ? previousYear : currentYear}
            />
            <Line
              type="monotone"
              dataKey="previous"
              name="previous"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "hsl(var(--muted-foreground))", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="current"
              name="current"
              stroke="hsl(var(--lavcom-green))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--lavcom-green))", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
