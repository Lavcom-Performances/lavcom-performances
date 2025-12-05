import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { PaymentPieChart } from "@/components/dashboard/PaymentPieChart";

// Mock data - Répartition des paiements (basé sur le PDF)
const mockPaymentData = [
  { name: "Carte bancaire", value: 4303.50, color: "hsl(var(--lavcom-green))" },
  { name: "Espèces", value: 1516.80, color: "hsl(var(--chart-esp))" },
];

export default function PaymentDistributionPage() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("01");
  const [selectedMachine, setSelectedMachine] = useState("all");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Répartition des paiements
          </h1>
          <p className="text-muted-foreground">
            Distribution par mode de paiement
          </p>
        </div>
        
        <ChartFilters
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedMachine={selectedMachine}
          onMachineChange={setSelectedMachine}
          showYearFilter
          showMonthFilter
          showMachineFilter
        />
      </div>

      {/* Chart */}
      <div className="max-w-2xl">
        <PaymentPieChart data={mockPaymentData} />
      </div>
    </div>
  );
}
