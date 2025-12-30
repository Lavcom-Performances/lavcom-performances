import { useState } from "react";
import { useDateRange } from "@/hooks/useDateRange";
import { useMachineStats } from "@/hooks/useChartsData";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ViewType = "ca" | "ventes";

export default function MachineTypePage() {
  const { dateRange, setDateRange } = useDateRange();
  const { data: machineData, isLoading } = useMachineStats();
  const [selectedView, setSelectedView] = useState<ViewType>("ca");

  const caTotals = {
    esp: machineData?.reduce((sum, m) => sum + m.caEsp, 0) ?? 0,
    cb: machineData?.reduce((sum, m) => sum + m.caCb, 0) ?? 0,
    total: machineData?.reduce((sum, m) => sum + m.caTotal, 0) ?? 0,
  };

  const ventesTotals = {
    esp: machineData?.reduce((sum, m) => sum + m.ventesEsp, 0) ?? 0,
    cb: machineData?.reduce((sum, m) => sum + m.ventesCb, 0) ?? 0,
    total: machineData?.reduce((sum, m) => sum + m.ventesTotal, 0) ?? 0,
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Détail par Machine
            </h1>
            <p className="text-muted-foreground">
              Chiffre d'affaires et ventes par machine
            </p>
          </div>
          <DateRangePicker 
            dateRange={dateRange} 
            onDateChange={setDateRange}
            showPresets
          />
        </div>
        
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
        </div>
      </div>

      {isLoading ? (
        <div className="kpi-card h-[400px]">
          <Skeleton className="h-full w-full" />
        </div>
      ) : !machineData || machineData.length === 0 ? (
        <div className="kpi-card h-[400px] flex items-center justify-center text-muted-foreground">
          Aucune donnée disponible pour la période sélectionnée
        </div>
      ) : (
        <div className="kpi-card">
          {selectedView === "ca" ? (
            <>
              <h3 className="font-display font-semibold text-lg mb-4">CA par machine</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead className="text-right">CA ESP</TableHead>
                      <TableHead className="text-right">CA CB</TableHead>
                      <TableHead className="text-right font-semibold">CA Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machineData.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.caEsp)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.caCb)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(row.caTotal)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">{formatCurrency(caTotals.esp)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(caTotals.cb)}</TableCell>
                      <TableCell className="text-right text-primary">{formatCurrency(caTotals.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-display font-semibold text-lg mb-4">Ventes par machine</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead className="text-right">Ventes ESP</TableHead>
                      <TableHead className="text-right">Ventes CB</TableHead>
                      <TableHead className="text-right font-semibold">Total Ventes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machineData.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right">{row.ventesEsp}</TableCell>
                        <TableCell className="text-right">{row.ventesCb}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{row.ventesTotal}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">{ventesTotals.esp}</TableCell>
                      <TableCell className="text-right">{ventesTotals.cb}</TableCell>
                      <TableCell className="text-right text-primary">{ventesTotals.total}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
