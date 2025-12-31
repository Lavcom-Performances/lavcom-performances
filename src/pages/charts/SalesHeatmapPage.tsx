import { useDateRange } from "@/hooks/useDateRange";
import { useHeatmapData } from "@/hooks/useChartsData";
import { useChartPreferences } from "@/hooks/useChartPreferences";
import { useHasData } from "@/hooks/useHasData";
import { ChartPageFilters } from "@/components/charts/ChartPageFilters";
import { SalesHeatmap } from "@/components/dashboard/SalesHeatmap";
import { ChartEmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalesHeatmapPage() {
  const { dateRange, setDateRange } = useDateRange();
  const { filters, setFilters, isLoaded } = useChartPreferences("heatmap");
  const { data: heatmapData, isLoading } = useHeatmapData(filters);
  const { hasData, isLoading: isLoadingHasData } = useHasData();

  if (!isLoaded || isLoadingHasData) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="p-6 lg:p-8">
        <ChartEmptyState />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Heatmap des ventes
          </h1>
          <p className="text-muted-foreground">
            Volume de cycles par jour et heure
          </p>
        </div>
        <ChartPageFilters
          dateRange={dateRange}
          onDateChange={setDateRange}
          filters={filters}
          onFiltersChange={setFilters}
          showMachineType
          showMachine
          showPaymentMode={false}
          showDayOfWeek={false}
        />
      </div>

      <div className="max-w-5xl">
        {isLoading ? (
          <div className="kpi-card h-[500px]">
            <Skeleton className="h-full w-full" />
          </div>
        ) : !heatmapData || heatmapData.length === 0 ? (
          <div className="kpi-card h-[400px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible pour la période sélectionnée
          </div>
        ) : (
          <SalesHeatmap data={heatmapData} />
        )}
      </div>
    </div>
  );
}
