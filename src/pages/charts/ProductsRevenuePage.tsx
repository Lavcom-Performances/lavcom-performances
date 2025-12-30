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

export default function ProductsRevenuePage() {
  const { dateRange, setDateRange } = useDateRange();
  const { data: machineData, isLoading } = useMachineStats();

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const totals = {
    esp: machineData?.reduce((sum, m) => sum + m.caEsp, 0) ?? 0,
    cb: machineData?.reduce((sum, m) => sum + m.caCb, 0) ?? 0,
    total: machineData?.reduce((sum, m) => sum + m.caTotal, 0) ?? 0,
    ventes: machineData?.reduce((sum, m) => sum + m.ventesTotal, 0) ?? 0,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA Produits & Machines
          </h1>
          <p className="text-muted-foreground">
            Chiffre d'affaires par machine
          </p>
        </div>
        <DateRangePicker 
          dateRange={dateRange} 
          onDateChange={setDateRange}
          showPresets
        />
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
          <h3 className="font-display font-semibold text-lg mb-4">Détail par machine</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead className="text-right">Nb ventes</TableHead>
                  <TableHead className="text-right">CA ESP</TableHead>
                  <TableHead className="text-right">CA CB</TableHead>
                  <TableHead className="text-right font-semibold">CA Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machineData.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">{row.ventesTotal}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.caEsp)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.caCb)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(row.caTotal)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{totals.ventes}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.esp)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.cb)}</TableCell>
                  <TableCell className="text-right text-primary">{formatCurrency(totals.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
