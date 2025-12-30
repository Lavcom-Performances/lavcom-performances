import { useDateRange } from "@/hooks/useDateRange";
import { usePaymentDistribution } from "@/hooks/useChartsData";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { PaymentPieChart } from "@/components/dashboard/PaymentPieChart";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentDistributionPage() {
  const { dateRange, setDateRange } = useDateRange();
  const { data: paymentData, isLoading } = usePaymentDistribution();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Répartition des paiements
          </h1>
          <p className="text-muted-foreground">
            Distribution par mode de paiement
          </p>
        </div>
        <DateRangePicker 
          dateRange={dateRange} 
          onDateChange={setDateRange}
          showPresets
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
