import { useDateRange } from "@/hooks/useDateRange";
import { usePaymentDistribution } from "@/hooks/useChartsData";
import { useChartPreferences } from "@/hooks/useChartPreferences";
import { ChartPageFilters } from "@/components/charts/ChartPageFilters";
import { PaymentPieChart } from "@/components/dashboard/PaymentPieChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasData } from "@/hooks/useHasData";
import { ChartEmptyState } from "@/components/ui/empty-state";

export default function PaymentDistributionPage() {
  const { dateRange, setDateRange } = useDateRange();
  const { filters, setFilters, isLoaded } = useChartPreferences("payment_distribution");
  const { data: paymentData, isLoading } = usePaymentDistribution(filters);
  const { hasData: hasImportedData, isLoading: dataLoading } = useHasData();

  if (!isLoaded || dataLoading) {
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
            Répartition des paiements
          </h1>
          <p className="text-muted-foreground">
            Distribution par mode de paiement
          </p>
        </div>
        <div className="card-lavcom">
          <ChartEmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Répartition des paiements
          </h1>
          <p className="text-muted-foreground">
            Distribution par mode de paiement
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
          showDayOfWeek
        />
      </div>

      <div className="max-w-2xl">
        {isLoading ? (
          <div className="kpi-card h-[400px]">
            <Skeleton className="h-full w-full" />
          </div>
        ) : !paymentData || paymentData.length === 0 ? (
          <div className="kpi-card h-[400px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible pour la période sélectionnée
          </div>
        ) : (
          <PaymentPieChart data={paymentData} />
        )}
      </div>
    </div>
  );
}
