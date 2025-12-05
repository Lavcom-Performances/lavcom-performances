import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { MachineTypeChart } from "@/components/dashboard/MachineTypeChart";

// Mock data basé sur le PDF - CA et cycles par type de machine
const mockMachineData = [
  { type: "Sèche-linge 1 14kg", ca: 1606.50, cycles: 517 },
  { type: "Sèche-linge 2 14kg", ca: 219.00, cycles: 76 },
  { type: "Lave-linge 3 14kg", ca: 986.00, cycles: 116 },
  { type: "Lave-linge 4 14kg", ca: 1215.50, cycles: 143 },
  { type: "Lave-linge 5 7kg", ca: 891.00, cycles: 198 },
  { type: "Lave-linge 6 7kg", ca: 598.50, cycles: 133 },
  { type: "Lessive 7", ca: 118.80, cycles: 198 },
];

export default function MachineTypePage() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("01");
  const [selectedPayment, setSelectedPayment] = useState("all");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA par type de machine
          </h1>
          <p className="text-muted-foreground">
            Chiffre d'affaires et nombre de cycles par machine
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
      <div className="max-w-5xl">
        <MachineTypeChart data={mockMachineData} />
      </div>
    </div>
  );
}
