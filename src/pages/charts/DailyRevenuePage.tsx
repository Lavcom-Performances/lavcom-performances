import { useState } from "react";
import { useDateRange } from "@/hooks/useDateRange";
import { useDailyRevenue } from "@/hooks/useChartsData";
import { ChartPageFilters, defaultChartFilters } from "@/components/charts/ChartPageFilters";
import { DailyRevenueChart } from "@/components/dashboard/DailyRevenueChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasData } from "@/hooks/useHasData";
import { ChartEmptyState, DataLoadErrorState } from "@/components/ui/empty-state";

export default function DailyRevenuePage() {
  const { dateRange, setDateRange } = useDateRange();
  const [filters, setFilters] = useState(defaultChartFilters);
  const { data: dailyData, isLoading, isError, refetch } = useDailyRevenue(filters);
  const { hasData: hasImportedData, isLoading: dataLoading } = useHasData();

  const chartData = dailyData?.map(d => ({
    date: d.date,
    revenue: d.revenue,
  })) ?? [];

  // Loading state
  if (dataLoading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  // No data imported at all - show premium empty state
  if (!hasImportedData) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA par jour
          </h1>
          <p className="text-muted-foreground">
            Évolution du chiffre d'affaires journalier
          </p>
        </div>
        <div className="card-lavcom">
          <ChartEmptyState />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-6 lg:p-8">
        <DataLoadErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA par jour
          </h1>
          <p className="text-muted-foreground">
            Évolution du chiffre d'affaires journalier
          </p>
        </div>
        <ChartPageFilters
          dateRange={dateRange}
          onDateChange={setDateRange}
          filters={filters}
          onFiltersChange={setFilters}
          showMachineType
          showMachine
          showPaymentMode
          showDayOfWeek
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
