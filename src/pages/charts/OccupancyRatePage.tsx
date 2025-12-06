import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

// Constants for occupancy calculation
const OPERATING_HOURS = 15; // 15 hours per day
const OPERATING_MINUTES = OPERATING_HOURS * 60; // 900 minutes
const DAYS_PER_MONTH = 30;

// Cycle durations in minutes
const WASHING_CYCLE_DURATION = 40;
const DRYER_CYCLE_DURATION = 8;

// Optimal cycles per day
const WASHING_OPTIMAL_PER_DAY = Math.floor(OPERATING_MINUTES / WASHING_CYCLE_DURATION); // 22
const DRYER_OPTIMAL_PER_DAY = Math.floor(OPERATING_MINUTES / DRYER_CYCLE_DURATION); // 112

// Optimal cycles per month
const WASHING_OPTIMAL_PER_MONTH = WASHING_OPTIMAL_PER_DAY * DAYS_PER_MONTH; // ~660
const DRYER_OPTIMAL_PER_MONTH = DRYER_OPTIMAL_PER_DAY * DAYS_PER_MONTH; // ~3360

interface MachineOccupancy {
  id: string;
  name: string;
  type: "LL" | "SL"; // Lave-Linge ou Sèche-Linge
  cyclesReels: number;
  cyclesOptimaux: number;
  tauxOccupation: number;
}

// Mock data - replace with real data
const rawMachineData: Omit<MachineOccupancy, "tauxOccupation">[] = [
  { id: "LL1", name: "Lave-linge 1 (8kg)", type: "LL", cyclesReels: 485, cyclesOptimaux: WASHING_OPTIMAL_PER_MONTH },
  { id: "LL2", name: "Lave-linge 2 (8kg)", type: "LL", cyclesReels: 512, cyclesOptimaux: WASHING_OPTIMAL_PER_MONTH },
  { id: "LL3", name: "Lave-linge 3 (12kg)", type: "LL", cyclesReels: 398, cyclesOptimaux: WASHING_OPTIMAL_PER_MONTH },
  { id: "LL4", name: "Lave-linge 4 (18kg)", type: "LL", cyclesReels: 324, cyclesOptimaux: WASHING_OPTIMAL_PER_MONTH },
  { id: "SL1", name: "Sèche-linge 1 (14kg)", type: "SL", cyclesReels: 1850, cyclesOptimaux: DRYER_OPTIMAL_PER_MONTH },
  { id: "SL2", name: "Sèche-linge 2 (14kg)", type: "SL", cyclesReels: 1920, cyclesOptimaux: DRYER_OPTIMAL_PER_MONTH },
  { id: "SL3", name: "Sèche-linge 3 (14kg)", type: "SL", cyclesReels: 2100, cyclesOptimaux: DRYER_OPTIMAL_PER_MONTH },
];

const machineData: MachineOccupancy[] = rawMachineData.map(m => ({
  ...m,
  tauxOccupation: Math.round((m.cyclesReels / m.cyclesOptimaux) * 100)
}));

function getOccupancyColor(rate: number): string {
  if (rate >= 80) return "bg-chart-esp"; // green - high usage
  if (rate >= 50) return "bg-chart-cb"; // blue - medium usage
  return "bg-muted"; // gray - low usage
}

function getOccupancyTextColor(rate: number): string {
  if (rate >= 80) return "text-chart-esp";
  if (rate >= 50) return "text-chart-cb";
  return "text-muted-foreground";
}

export default function OccupancyRatePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // Calculate totals
  const washingMachines = machineData.filter(m => m.type === "LL");
  const dryerMachines = machineData.filter(m => m.type === "SL");

  const totalWashingCycles = washingMachines.reduce((sum, m) => sum + m.cyclesReels, 0);
  const totalWashingOptimal = washingMachines.reduce((sum, m) => sum + m.cyclesOptimaux, 0);
  const avgWashingRate = Math.round((totalWashingCycles / totalWashingOptimal) * 100);

  const totalDryerCycles = dryerMachines.reduce((sum, m) => sum + m.cyclesReels, 0);
  const totalDryerOptimal = dryerMachines.reduce((sum, m) => sum + m.cyclesOptimaux, 0);
  const avgDryerRate = Math.round((totalDryerCycles / totalDryerOptimal) * 100);

  const totalAllCycles = totalWashingCycles + totalDryerCycles;
  const totalAllOptimal = totalWashingOptimal + totalDryerOptimal;
  const avgTotalRate = Math.round((totalAllCycles / totalAllOptimal) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Taux d'occupation
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyse du taux d'occupation par machine
          </p>
        </div>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getOccupancyTextColor(avgTotalRate)}`}>
              {avgTotalRate}%
            </div>
            <Progress value={avgTotalRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {totalAllCycles.toLocaleString()} / {totalAllOptimal.toLocaleString()} cycles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lave-linge (cycle 40 min)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getOccupancyTextColor(avgWashingRate)}`}>
              {avgWashingRate}%
            </div>
            <Progress value={avgWashingRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {totalWashingCycles.toLocaleString()} / {totalWashingOptimal.toLocaleString()} cycles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sèche-linge (cycle 8 min)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getOccupancyTextColor(avgDryerRate)}`}>
              {avgDryerRate}%
            </div>
            <Progress value={avgDryerRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {totalDryerCycles.toLocaleString()} / {totalDryerOptimal.toLocaleString()} cycles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Lave-linge :</span> {OPERATING_HOURS}h d'ouverture × 60 min ÷ {WASHING_CYCLE_DURATION} min = <span className="font-bold">{WASHING_OPTIMAL_PER_DAY} cycles/jour</span> → {WASHING_OPTIMAL_PER_MONTH} cycles/mois
            </div>
            <div>
              <span className="font-semibold">Sèche-linge :</span> {OPERATING_HOURS}h d'ouverture × 60 min ÷ {DRYER_CYCLE_DURATION} min = <span className="font-bold">{DRYER_OPTIMAL_PER_DAY} cycles/jour</span> → {DRYER_OPTIMAL_PER_MONTH} cycles/mois
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Machine Table */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par machine</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Cycles réels</TableHead>
                <TableHead className="text-right">Cycles optimaux</TableHead>
                <TableHead className="text-right">Taux d'occupation</TableHead>
                <TableHead className="w-[200px]">Progression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machineData.map((machine) => (
                <TableRow key={machine.id}>
                  <TableCell className="font-medium">{machine.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      machine.type === "LL" ? "bg-chart-cb/20 text-chart-cb" : "bg-chart-esp/20 text-chart-esp"
                    }`}>
                      {machine.type === "LL" ? "Lave-linge" : "Sèche-linge"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{machine.cyclesReels.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{machine.cyclesOptimaux.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-bold ${getOccupancyTextColor(machine.tauxOccupation)}`}>
                    {machine.tauxOccupation}%
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={machine.tauxOccupation} 
                        className="flex-1"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
