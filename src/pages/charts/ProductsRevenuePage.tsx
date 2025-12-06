import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { ProductsDailyTable } from "@/components/dashboard/ProductsDailyTable";
import { realProductsDailyData, productsDailyTotals } from "@/data/productsDailyData";

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
            CA Produits & Machines
          </h1>
          <p className="text-muted-foreground">
            Chiffre d'affaires par machine et par jour
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

      {/* Table with heatmap */}
      <ProductsDailyTable data={realProductsDailyData} totals={productsDailyTotals} />
    </div>
  );
}
