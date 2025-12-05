import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";

// Mock data - CA par mois
const mockMonthlyData = [
  { month: "Jan", revenue: 5820.30 },
  { month: "Fév", revenue: 5420.80 },
  { month: "Mar", revenue: 4520 },
  { month: "Avr", revenue: 4180 },
  { month: "Mai", revenue: 4750 },
  { month: "Juin", revenue: 5120 },
  { month: "Juil", revenue: 5890 },
  { month: "Août", revenue: 4980 },
  { month: "Sep", revenue: 4650 },
  { month: "Oct", revenue: 4890 },
  { month: "Nov", revenue: 5240 },
  { month: "Déc", revenue: 3495 },
];

export default function MonthlyRevenuePage() {
  const [selectedYear, setSelectedYear] = useState("2025");
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
        <MonthlyRevenueChart data={mockMonthlyData} />
      </div>
    </div>
  );
}
