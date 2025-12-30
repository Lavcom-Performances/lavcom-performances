import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";

export default function MonthlyRevenuePage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedPayment, setSelectedPayment] = useState("all");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA par mois
          </h1>
          <p className="text-muted-foreground">
            Évolution du chiffre d'affaires mensuel
          </p>
        </div>
        
        <ChartFilters
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedPayment={selectedPayment}
          onPaymentChange={setSelectedPayment}
          showYearFilter
          showPaymentFilter
        />
      </div>

      {/* Chart */}
      <div className="max-w-5xl">
        <MonthlyRevenueChart year={parseInt(selectedYear)} />
      </div>
    </div>
  );
}
