import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { MachineCATable, MachineVentesTable } from "@/components/dashboard/MachineTable";
import { DailyCyclesTable } from "@/components/dashboard/DailyCyclesTable";

// Mock data CA par machine (basé sur le PDF de référence)
const mockCAData = [
  { name: "Sèche-linge 1", capacity: "14kg", caEsp: 483.00, caCb: 1123.50, caTotal: 1606.50, caPrevu: 1700.00 },
  { name: "Sèche-linge 2", capacity: "14kg", caEsp: 66.00, caCb: 153.00, caTotal: 219.00, caPrevu: 500.00 },
  { name: "Lave-linge 3", capacity: "14kg", caEsp: 289.00, caCb: 697.00, caTotal: 986.00, caPrevu: 1450.00 },
  { name: "Lave-linge 4", capacity: "14kg", caEsp: 263.50, caCb: 952.00, caTotal: 1215.50, caPrevu: 1200.00 },
  { name: "Lave-linge 5", capacity: "7kg", caEsp: 220.50, caCb: 670.50, caTotal: 891.00, caPrevu: 950.00 },
  { name: "Lave-linge 6", capacity: "7kg", caEsp: 135.00, caCb: 463.50, caTotal: 598.50, caPrevu: 800.00 },
  { name: "Lessive 7", capacity: "20g", caEsp: 49.80, caCb: 69.00, caTotal: 118.80, caPrevu: 200.00 },
  { name: "Simply Pay", capacity: "App", caEsp: 10.00, caCb: 175.00, caTotal: 185.00, caPrevu: 200.00 },
];

const mockVentesData = [
  { name: "Sèche-linge 1", capacity: "14kg", ventesEsp: 168, ventesCb: 349, ventesTotal: 517 },
  { name: "Sèche-linge 2", capacity: "14kg", ventesEsp: 24, ventesCb: 52, ventesTotal: 76 },
  { name: "Lave-linge 3", capacity: "14kg", ventesEsp: 34, ventesCb: 82, ventesTotal: 116 },
  { name: "Lave-linge 4", capacity: "14kg", ventesEsp: 31, ventesCb: 112, ventesTotal: 143 },
  { name: "Lave-linge 5", capacity: "7kg", ventesEsp: 49, ventesCb: 149, ventesTotal: 198 },
  { name: "Lave-linge 6", capacity: "7kg", ventesEsp: 30, ventesCb: 103, ventesTotal: 133 },
  { name: "Lessive 7", capacity: "20g", ventesEsp: 83, ventesCb: 115, ventesTotal: 198 },
];

// Mock data Cycles par jour (basé sur le PDF NB_MACH_MCL_CA_2025_D.pdf)
const mockDailyCyclesData = [
  { day: 1, janvier: 10, fevrier: 26, mars: 19, avril: 23, mai: 18, juin: 26, juillet: 10, aout: 19, septembre: 22, octobre: 25, novembre: 25, total: 223 },
  { day: 2, janvier: 10, fevrier: 36, mars: 36, avril: 10, mai: 19, juin: 17, juillet: 13, aout: 17, septembre: 25, octobre: 20, novembre: 30, total: 233 },
  { day: 3, janvier: 22, fevrier: 17, mars: 23, avril: 20, mai: 18, juin: 22, juillet: 19, aout: 22, septembre: 14, octobre: 13, novembre: 14, total: 204 },
  { day: 4, janvier: 22, fevrier: 19, mars: 18, avril: 27, mai: 32, juin: 18, juillet: 24, aout: 15, septembre: 25, octobre: 34, novembre: 19, total: 253 },
  { day: 5, janvier: 37, fevrier: 18, mars: 16, avril: 28, mai: 24, juin: 19, juillet: 10, aout: 16, septembre: 21, octobre: 30, novembre: 18, total: 237 },
  { day: 6, janvier: 15, fevrier: 24, mars: 17, avril: 24, mai: 9, juin: 19, juillet: 25, aout: 18, septembre: 27, octobre: 17, novembre: 13, total: 208 },
  { day: 7, janvier: 10, fevrier: 19, mars: 17, avril: 30, mai: 15, juin: 29, juillet: 19, aout: 22, septembre: 36, octobre: 32, novembre: 19, total: 248 },
  { day: 8, janvier: 20, fevrier: 17, mars: 16, avril: 20, mai: 20, juin: 22, juillet: 12, aout: 20, septembre: 16, octobre: 16, novembre: 28, total: 207 },
  { day: 9, janvier: 20, fevrier: 30, mars: 38, avril: 16, mai: 18, juin: 25, juillet: 14, aout: 26, septembre: 24, octobre: 11, novembre: 33, total: 255 },
  { day: 10, janvier: 14, fevrier: 24, mars: 24, avril: 13, mai: 25, juin: 16, juillet: 15, aout: 27, septembre: 19, octobre: 9, novembre: 23, total: 209 },
  { day: 11, janvier: 36, fevrier: 17, mars: 22, avril: 21, mai: 36, juin: 22, juillet: 19, aout: 26, septembre: 18, octobre: 31, novembre: 30, total: 278 },
  { day: 12, janvier: 39, fevrier: 18, mars: 14, avril: 10, mai: 18, juin: 12, juillet: 28, aout: 16, septembre: 21, octobre: 40, novembre: 19, total: 235 },
  { day: 13, janvier: 18, fevrier: 21, mars: 5, avril: 30, mai: 16, juin: 19, juillet: 22, aout: 20, septembre: 36, octobre: 24, novembre: 16, total: 227 },
  { day: 14, janvier: 17, fevrier: 15, mars: 18, avril: 12, mai: 17, juin: 25, juillet: 30, aout: 34, septembre: 38, octobre: 17, novembre: 18, total: 241 },
  { day: 15, janvier: 18, fevrier: 11, mars: 17, avril: 8, mai: 16, juin: 30, juillet: 24, aout: 19, septembre: 24, octobre: 14, novembre: 19, total: 200 },
  { day: 16, janvier: 19, fevrier: 26, mars: 33, avril: 8, mai: 18, juin: 23, juillet: 20, aout: 26, septembre: 14, octobre: 15, novembre: 25, total: 227 },
  { day: 17, janvier: 17, fevrier: 18, mars: 15, avril: 18, mai: 31, juin: 19, juillet: 21, aout: 27, septembre: 26, octobre: 19, novembre: 17, total: 228 },
  { day: 18, janvier: 19, fevrier: 21, mars: 11, avril: 14, mai: 28, juin: 16, juillet: 11, aout: 20, septembre: 9, octobre: 21, novembre: 11, total: 181 },
  { day: 19, janvier: 29, fevrier: 11, mars: 10, avril: 16, mai: 31, juin: 19, juillet: 28, aout: 24, septembre: 28, octobre: 29, novembre: 13, total: 238 },
  { day: 20, janvier: 21, fevrier: 16, mars: 8, avril: 22, mai: 18, juin: 21, juillet: 33, aout: 19, septembre: 29, octobre: 22, novembre: 14, total: 223 },
  { day: 21, janvier: 16, fevrier: 26, mars: 16, avril: 32, mai: 23, juin: 34, juillet: 18, aout: 31, septembre: 38, octobre: 14, novembre: 18, total: 266 },
  { day: 22, janvier: 18, fevrier: 19, mars: 23, avril: 11, mai: 15, juin: 20, juillet: 19, aout: 11, septembre: 25, octobre: 21, novembre: 23, total: 205 },
  { day: 23, janvier: 15, fevrier: 28, mars: 27, avril: 17, mai: 20, juin: 18, juillet: 14, aout: 21, septembre: 17, octobre: 20, novembre: 19, total: 216 },
  { day: 24, janvier: 30, fevrier: 16, mars: 18, avril: 15, mai: 19, juin: 20, juillet: 10, aout: 32, septembre: 9, octobre: 20, novembre: 19, total: 208 },
  { day: 25, janvier: 21, fevrier: 16, mars: 13, avril: 15, mai: 23, juin: 19, juillet: 22, aout: 19, septembre: 14, octobre: 27, novembre: 7, total: 196 },
  { day: 26, janvier: 35, fevrier: 16, mars: 11, avril: 22, mai: 18, juin: 19, juillet: 17, aout: 18, septembre: 11, octobre: 28, novembre: 14, total: 209 },
  { day: 27, janvier: 13, fevrier: 14, mars: 19, avril: 34, mai: 12, juin: 18, juillet: 34, aout: 23, septembre: 23, octobre: 17, novembre: 14, total: 221 },
  { day: 28, janvier: 16, fevrier: 18, mars: 14, avril: 19, mai: 20, juin: 19, juillet: 15, aout: 28, septembre: 34, octobre: 7, novembre: 10, total: 200 },
  { day: 29, janvier: 11, fevrier: 37, mars: 14, avril: 21, mai: 24, juin: 16, juillet: 7, aout: 32, septembre: 22, octobre: 24, novembre: undefined, total: 208 },
  { day: 30, janvier: 17, fevrier: undefined, mars: 21, avril: 26, mai: 17, juin: 17, juillet: 16, aout: 19, septembre: 21, octobre: 9, novembre: 34, total: 197 },
  { day: 31, janvier: 15, fevrier: undefined, mars: 12, avril: undefined, mai: 19, juin: undefined, juillet: 19, aout: 18, septembre: undefined, octobre: 25, novembre: undefined, total: 108 },
];

const monthTotals = {
  janvier: 620,
  fevrier: 584,
  mars: 545,
  avril: 572,
  mai: 639,
  juin: 620,
  juillet: 579,
  aout: 685,
  septembre: 677,
  octobre: 642,
  novembre: 534,
  decembre: 0,
  total: 6697,
};

const caTotals = {
  esp: mockCAData.reduce((sum, m) => sum + m.caEsp, 0),
  cb: mockCAData.reduce((sum, m) => sum + m.caCb, 0),
  total: mockCAData.reduce((sum, m) => sum + m.caTotal, 0),
  prevu: mockCAData.reduce((sum, m) => sum + m.caPrevu, 0),
};

const ventesTotals = {
  esp: mockVentesData.reduce((sum, m) => sum + m.ventesEsp, 0),
  cb: mockVentesData.reduce((sum, m) => sum + m.ventesCb, 0),
  total: mockVentesData.reduce((sum, m) => sum + m.ventesTotal, 0),
};

type ViewType = "ca" | "ventes" | "cycles";

export default function MachineTypePage() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedView, setSelectedView] = useState<ViewType>("ca");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Détail par Machine
          </h1>
          <p className="text-muted-foreground">
            Chiffre d'affaires, ventes et cycles par machine
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-end">
          <ChartFilters
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            showYearFilter
            showMonthFilter
          />
          
          {/* View selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedView("ca")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === "ca"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              CA par machine
            </button>
            <button
              onClick={() => setSelectedView("ventes")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === "ventes"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Ventes par machine
            </button>
            <button
              onClick={() => setSelectedView("cycles")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedView === "cycles"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Cycles par jour
            </button>
          </div>
        </div>
      </div>

      {/* Tables based on selected view */}
      <div className="space-y-6">
        {selectedView === "ca" && (
          <MachineCATable data={mockCAData} totals={caTotals} />
        )}
        {selectedView === "ventes" && (
          <MachineVentesTable data={mockVentesData} totals={ventesTotals} />
        )}
        {selectedView === "cycles" && (
          <DailyCyclesTable data={mockDailyCyclesData} monthTotals={monthTotals} />
        )}
      </div>
    </div>
  );
}
