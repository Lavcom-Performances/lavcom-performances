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
  const maxRevenue = Math.max(...machines.map(m => m.revenue));
  
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <WashingMachine className="h-5 w-5 text-primary" />
          Performance par machine
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-medium text-muted-foreground">Machine</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground">CA</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground">Cycles</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground">Occupation</TableHead>
                <TableHead className="font-medium text-muted-foreground w-32">Perf.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMachines.map((machine, index) => (
                <TableRow key={machine.id} className={cn(
                  index === 0 && "bg-lavcom-green/5"
                )}>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      {machine.type === "washer" ? (
                        <WashingMachine className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Wind className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="font-medium">{machine.name}</span>
                      {index === 0 && (
                        <span className="text-xs bg-lavcom-green/20 text-lavcom-green px-1.5 py-0.5 rounded">
                          Top
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {machine.revenue.toLocaleString('fr-FR')} €
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {machine.cycles}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-medium tabular-nums",
                      machine.occupancyRate >= 70 ? "text-lavcom-green" :
                      machine.occupancyRate >= 50 ? "text-amber-500" : "text-destructive"
                    )}>
                      {machine.occupancyRate}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Progress 
                      value={(machine.revenue / maxRevenue) * 100} 
                      className="h-2 [&>div]:bg-primary" 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
