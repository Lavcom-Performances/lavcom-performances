import { useDateRange } from "@/hooks/useDateRange";
import { useChartPreferences } from "@/hooks/useChartPreferences";
import { ChartPageFilters } from "@/components/charts/ChartPageFilters";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";
import { Skeleton } from "@/components/ui/skeleton";

export default function MonthlyRevenuePage() {
  const { dateRange, setDateRange } = useDateRange();
  const { filters, setFilters, isLoaded } = useChartPreferences("monthly_revenue");

  if (!isLoaded) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA par mois
          </h1>
          <p className="text-muted-foreground">
            Évolution du chiffre d'affaires mensuel
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

      <div className="max-w-5xl">
        <MonthlyRevenueChart 
          startDate={dateRange?.from} 
          endDate={dateRange?.to} 
        />
      </div>
    </div>
  );
}
