import { useDateRange } from "@/hooks/useDateRange";
import { useDailyRevenue } from "@/hooks/useChartsData";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { DailyRevenueChart } from "@/components/dashboard/DailyRevenueChart";
import { Skeleton } from "@/components/ui/skeleton";

export default function DailyRevenuePage() {
  const { dateRange, setDateRange } = useDateRange();
  const { data: dailyData, isLoading } = useDailyRevenue();

  const chartData = dailyData?.map(d => ({
    date: d.date,
    revenue: d.revenue,
  })) ?? [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA par jour
          </h1>
          <p className="text-muted-foreground">
            Évolution du chiffre d'affaires journalier
          </p>
        </div>
        <DateRangePicker 
          dateRange={dateRange} 
          onDateChange={setDateRange}
          showPresets
        />
      </div>

      <div className="max-w-6xl">
        {isLoading ? (
          <div className="kpi-card h-[400px]">
            <Skeleton className="h-full w-full" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="kpi-card h-[400px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible pour la période sélectionnée
          </div>
        ) : (
          <DailyRevenueChart data={chartData} />
        )}
      </div>
    </div>
  );
}
