import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { ProductsRevenueChart } from "@/components/dashboard/ProductsRevenueChart";

// Mock data basé sur le PDF - CA Produits / Recharges
const mockProductsData = [
  { name: "Lessive", value: 118.80, color: "hsl(var(--chart-lessive))" },
  { name: "Recharges Simply Pay", value: 185.00, color: "hsl(var(--lavcom-green))" },
];

export default function ProductsRevenuePage() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("01");
  const [selectedPayment, setSelectedPayment] = useState("all");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA Produits & Recharges
          </h1>
          <p className="text-muted-foreground">
            Ventes de lessive et recharges d'application
          </p>
        </div>
        
        <ChartFilters
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedPayment={selectedPayment}
          onPaymentChange={setSelectedPayment}
          showYearFilter
          showMonthFilter
          showPaymentFilter
        />
      </div>

      {/* Chart */}
      <div className="max-w-3xl">
        <ProductsRevenueChart data={mockProductsData} />
      </div>
    </div>
  );
}
