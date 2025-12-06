import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { SalesHeatmap } from "@/components/dashboard/SalesHeatmap";
import { realHeatmapData } from "@/data/heatmapData";

export default function SalesHeatmapPage() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("01");
  const [selectedMachine, setSelectedMachine] = useState("all");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Heatmap des ventes
          </h1>
          <p className="text-muted-foreground">
            Volume de cycles par jour et heure
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
      <div className="max-w-4xl">
        <SalesHeatmap data={realHeatmapData} />
      </div>
    </div>
  );
}
