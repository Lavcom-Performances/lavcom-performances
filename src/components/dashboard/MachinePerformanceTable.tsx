import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HorizontalScrollTable } from "@/components/ui/horizontal-scroll-table";
import { WashingMachine, Wind } from "lucide-react";

interface MachineData {
  id: string;
  name: string;
  type: "washer" | "dryer";
  revenue: number;
  cycles: number;
  occupancyRate: number;
}

interface MachinePerformanceTableProps {
  machines: MachineData[];
  className?: string;
}

export function MachinePerformanceTable({ machines, className }: MachinePerformanceTableProps) {
  const sortedMachines = [...machines].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(...machines.map(m => m.revenue), 1);
  
  return (
    <div className={cn("dashboard-card p-0", className)}>
      <div className="dashboard-card-header px-5 pt-5">
        <div className="flex items-center gap-2">
          <WashingMachine className="h-4 w-4 text-primary" />
          <h3 className="dashboard-card-title">Performance par machine</h3>
        </div>
      </div>
      <div className="px-1 pb-4">
        <HorizontalScrollTable>
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Machine</TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">CA</TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Cycles</TableHead>
                <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Occupation</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-28">Perf.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMachines.map((machine, index) => (
                <TableRow key={machine.id} className={cn(
                  "hover:bg-muted/20",
                  index === 0 && "bg-lime-50/50 dark:bg-lime-900/10"
                )}>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      {machine.type === "washer" ? (
                        <WashingMachine className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Wind className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="font-medium text-sm">{machine.name}</span>
                      {index === 0 && (
                        <span className="text-[10px] bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400 px-1.5 py-0.5 rounded font-medium uppercase">
                          Top
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm tabular-nums">
                    {machine.revenue.toLocaleString('fr-FR')} €
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                    {machine.cycles}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-medium text-sm tabular-nums",
                      machine.occupancyRate >= 70 ? "text-lime-600" :
                      machine.occupancyRate >= 50 ? "text-amber-500" : "text-red-500"
                    )}>
                      {machine.occupancyRate}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Progress 
                      value={(machine.revenue / maxRevenue) * 100} 
                      className="h-1.5 [&>div]:bg-primary" 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </HorizontalScrollTable>
      </div>
    </div>
  );
}
