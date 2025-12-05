import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { DailyRevenueChart } from "@/components/dashboard/DailyRevenueChart";

// Mock data - CA par jour (Janvier 2025)
const mockDailyData = [
  { date: "01/01", revenue: 111.00 },
  { date: "02/01", revenue: 146.90 },
  { date: "03/01", revenue: 223.00 },
  { date: "04/01", revenue: 224.30 },
  { date: "05/01", revenue: 178.50 },
  { date: "06/01", revenue: 195.80 },
  { date: "07/01", revenue: 209.40 },
  { date: "08/01", revenue: 187.20 },
  { date: "09/01", revenue: 165.40 },
  { date: "10/01", revenue: 198.30 },
  { date: "11/01", revenue: 234.50 },
  { date: "12/01", revenue: 189.70 },
  { date: "13/01", revenue: 201.40 },
  { date: "14/01", revenue: 178.90 },
  { date: "15/01", revenue: 212.30 },
  { date: "16/01", revenue: 245.60 },
  { date: "17/01", revenue: 198.40 },
  { date: "18/01", revenue: 267.80 },
  { date: "19/01", revenue: 189.50 },
  { date: "20/01", revenue: 176.40 },
  { date: "21/01", revenue: 201.20 },
  { date: "22/01", revenue: 187.90 },
  { date: "23/01", revenue: 234.10 },
  { date: "24/01", revenue: 256.40 },
  { date: "25/01", revenue: 278.90 },
  { date: "26/01", revenue: 198.30 },
  { date: "27/01", revenue: 167.50 },
  { date: "28/01", revenue: 189.80 },
  { date: "29/01", revenue: 201.40 },
  { date: "30/01", revenue: 178.60 },
  { date: "31/01", revenue: 195.40 },
];

export default function DailyRevenuePage() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("01");
  const [selectedPayment, setSelectedPayment] = useState("all");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA par jour
          </h1>
          <p className="text-muted-foreground">
            Évolution du chiffre d'affaires journalier
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
      <div className="max-w-6xl">
        <DailyRevenueChart data={mockDailyData} />
      </div>
    </div>
  );
}
