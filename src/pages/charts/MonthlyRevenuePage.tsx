import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";

export default function MonthlyRevenuePage() {
  const { dateRange, setDateRange } = useDateRange();
  const selectedYear = dateRange?.from?.getFullYear() ?? new Date().getFullYear();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA par mois
          </h1>
          <p className="text-muted-foreground">
            Évolution du chiffre d'affaires mensuel
          </p>
        </div>
        <DateRangePicker 
          dateRange={dateRange} 
          onDateChange={setDateRange}
          showPresets
        />
      </div>

      <div className="max-w-5xl">
        <MonthlyRevenueChart year={selectedYear} />
      </div>
    </div>
  );
}
