import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import { MachineCATable, MachineVentesTable } from "@/components/dashboard/MachineTable";

// Mock data basé sur le PDF de référence
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
            Détail par Machine
          </h1>
          <p className="text-muted-foreground">
            Chiffre d'affaires et ventes par machine
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
          showPaymentFilter={false}
        />
      </div>

      {/* Tables */}
      <div className="space-y-6">
        <MachineCATable data={mockCAData} totals={caTotals} />
        <MachineVentesTable data={mockVentesData} totals={ventesTotals} />
      </div>
    </div>
  );
}
