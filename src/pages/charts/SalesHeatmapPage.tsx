import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { SalesHeatmap } from "@/components/dashboard/SalesHeatmap";

// Mock data - Heatmap (jour x heure)
const mockHeatmapData = [
  // Lundi
  { day: "Lun", hour: 7, cycles: 2 },
  { day: "Lun", hour: 8, cycles: 5 },
  { day: "Lun", hour: 9, cycles: 8 },
  { day: "Lun", hour: 10, cycles: 12 },
  { day: "Lun", hour: 11, cycles: 10 },
  { day: "Lun", hour: 12, cycles: 6 },
  { day: "Lun", hour: 13, cycles: 4 },
  { day: "Lun", hour: 14, cycles: 8 },
  { day: "Lun", hour: 15, cycles: 9 },
  { day: "Lun", hour: 16, cycles: 11 },
  { day: "Lun", hour: 17, cycles: 14 },
  { day: "Lun", hour: 18, cycles: 16 },
  { day: "Lun", hour: 19, cycles: 12 },
  { day: "Lun", hour: 20, cycles: 8 },
  { day: "Lun", hour: 21, cycles: 3 },
  // Mardi
  { day: "Mar", hour: 7, cycles: 1 },
  { day: "Mar", hour: 8, cycles: 4 },
  { day: "Mar", hour: 9, cycles: 7 },
  { day: "Mar", hour: 10, cycles: 10 },
  { day: "Mar", hour: 11, cycles: 8 },
  { day: "Mar", hour: 12, cycles: 5 },
  { day: "Mar", hour: 13, cycles: 3 },
  { day: "Mar", hour: 14, cycles: 6 },
  { day: "Mar", hour: 15, cycles: 8 },
  { day: "Mar", hour: 16, cycles: 10 },
  { day: "Mar", hour: 17, cycles: 13 },
  { day: "Mar", hour: 18, cycles: 15 },
  { day: "Mar", hour: 19, cycles: 11 },
  { day: "Mar", hour: 20, cycles: 7 },
  { day: "Mar", hour: 21, cycles: 2 },
  // Mercredi
  { day: "Mer", hour: 7, cycles: 3 },
  { day: "Mer", hour: 8, cycles: 6 },
  { day: "Mer", hour: 9, cycles: 9 },
  { day: "Mer", hour: 10, cycles: 14 },
  { day: "Mer", hour: 11, cycles: 12 },
  { day: "Mer", hour: 12, cycles: 7 },
  { day: "Mer", hour: 13, cycles: 5 },
  { day: "Mer", hour: 14, cycles: 10 },
  { day: "Mer", hour: 15, cycles: 11 },
  { day: "Mer", hour: 16, cycles: 13 },
  { day: "Mer", hour: 17, cycles: 16 },
  { day: "Mer", hour: 18, cycles: 18 },
  { day: "Mer", hour: 19, cycles: 14 },
  { day: "Mer", hour: 20, cycles: 9 },
  { day: "Mer", hour: 21, cycles: 4 },
  // Jeudi
  { day: "Jeu", hour: 7, cycles: 2 },
  { day: "Jeu", hour: 8, cycles: 5 },
  { day: "Jeu", hour: 9, cycles: 8 },
  { day: "Jeu", hour: 10, cycles: 11 },
  { day: "Jeu", hour: 11, cycles: 9 },
  { day: "Jeu", hour: 12, cycles: 6 },
  { day: "Jeu", hour: 13, cycles: 4 },
  { day: "Jeu", hour: 14, cycles: 7 },
  { day: "Jeu", hour: 15, cycles: 9 },
  { day: "Jeu", hour: 16, cycles: 12 },
  { day: "Jeu", hour: 17, cycles: 14 },
  { day: "Jeu", hour: 18, cycles: 17 },
  { day: "Jeu", hour: 19, cycles: 13 },
  { day: "Jeu", hour: 20, cycles: 8 },
  { day: "Jeu", hour: 21, cycles: 3 },
  // Vendredi
  { day: "Ven", hour: 7, cycles: 3 },
  { day: "Ven", hour: 8, cycles: 7 },
  { day: "Ven", hour: 9, cycles: 10 },
  { day: "Ven", hour: 10, cycles: 13 },
  { day: "Ven", hour: 11, cycles: 11 },
  { day: "Ven", hour: 12, cycles: 8 },
  { day: "Ven", hour: 13, cycles: 6 },
  { day: "Ven", hour: 14, cycles: 9 },
  { day: "Ven", hour: 15, cycles: 12 },
  { day: "Ven", hour: 16, cycles: 15 },
  { day: "Ven", hour: 17, cycles: 18 },
  { day: "Ven", hour: 18, cycles: 20 },
  { day: "Ven", hour: 19, cycles: 16 },
  { day: "Ven", hour: 20, cycles: 10 },
  { day: "Ven", hour: 21, cycles: 5 },
  // Samedi
  { day: "Sam", hour: 7, cycles: 4 },
  { day: "Sam", hour: 8, cycles: 8 },
  { day: "Sam", hour: 9, cycles: 14 },
  { day: "Sam", hour: 10, cycles: 18 },
  { day: "Sam", hour: 11, cycles: 20 },
  { day: "Sam", hour: 12, cycles: 16 },
  { day: "Sam", hour: 13, cycles: 12 },
  { day: "Sam", hour: 14, cycles: 15 },
  { day: "Sam", hour: 15, cycles: 17 },
  { day: "Sam", hour: 16, cycles: 19 },
  { day: "Sam", hour: 17, cycles: 22 },
  { day: "Sam", hour: 18, cycles: 18 },
  { day: "Sam", hour: 19, cycles: 14 },
  { day: "Sam", hour: 20, cycles: 8 },
  { day: "Sam", hour: 21, cycles: 4 },
  // Dimanche
  { day: "Dim", hour: 7, cycles: 1 },
  { day: "Dim", hour: 8, cycles: 3 },
  { day: "Dim", hour: 9, cycles: 6 },
  { day: "Dim", hour: 10, cycles: 10 },
  { day: "Dim", hour: 11, cycles: 12 },
  { day: "Dim", hour: 12, cycles: 9 },
  { day: "Dim", hour: 13, cycles: 7 },
  { day: "Dim", hour: 14, cycles: 8 },
  { day: "Dim", hour: 15, cycles: 10 },
  { day: "Dim", hour: 16, cycles: 11 },
  { day: "Dim", hour: 17, cycles: 13 },
  { day: "Dim", hour: 18, cycles: 10 },
  { day: "Dim", hour: 19, cycles: 7 },
  { day: "Dim", hour: 20, cycles: 4 },
  { day: "Dim", hour: 21, cycles: 2 },
];

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
        <SalesHeatmap data={mockHeatmapData} />
      </div>
    </div>
  );
}
