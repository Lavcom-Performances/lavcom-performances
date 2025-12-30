import { useState } from "react";
import { useDateRange } from "@/hooks/useDateRange";
import { useOccupancyRate } from "@/hooks/useChartsData";
import { ChartPageFilters, defaultChartFilters } from "@/components/charts/ChartPageFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getOccupancyTextColor(rate: number): string {
  if (rate >= 80) return "text-chart-esp";
  if (rate >= 50) return "text-chart-cb";
  return "text-muted-foreground";
}

export default function OccupancyRatePage() {
  const { dateRange, setDateRange } = useDateRange();
  const [filters, setFilters] = useState(defaultChartFilters);
  const { data: machineData, isLoading } = useOccupancyRate(filters);

  const washingMachines = machineData?.filter(m => m.type === "LL") ?? [];
  const dryerMachines = machineData?.filter(m => m.type === "SL") ?? [];

  const totalWashingCycles = washingMachines.reduce((sum, m) => sum + m.cyclesReels, 0);
  const totalWashingOptimal = washingMachines.reduce((sum, m) => sum + m.cyclesOptimaux, 0);
  const avgWashingRate = totalWashingOptimal > 0 ? Math.round((totalWashingCycles / totalWashingOptimal) * 100) : 0;

  const totalDryerCycles = dryerMachines.reduce((sum, m) => sum + m.cyclesReels, 0);
  const totalDryerOptimal = dryerMachines.reduce((sum, m) => sum + m.cyclesOptimaux, 0);
  const avgDryerRate = totalDryerOptimal > 0 ? Math.round((totalDryerCycles / totalDryerOptimal) * 100) : 0;

  const totalAllCycles = totalWashingCycles + totalDryerCycles;
  const totalAllOptimal = totalWashingOptimal + totalDryerOptimal;
  const avgTotalRate = totalAllOptimal > 0 ? Math.round((totalAllCycles / totalAllOptimal) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Taux d'occupation
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyse du taux d'occupation par machine
          </p>
        </div>
        <ChartPageFilters
          dateRange={dateRange}
          onDateChange={setDateRange}
          filters={filters}
          onFiltersChange={setFilters}
          showMachineType
          showMachine
          showPaymentMode={false}
          showDayOfWeek
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : !machineData || machineData.length === 0 ? (
        <div className="kpi-card h-[400px] flex items-center justify-center text-muted-foreground">
          Aucune donnée disponible pour la période sélectionnée
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
