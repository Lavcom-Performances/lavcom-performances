import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Machine</th>
                <th className="text-right p-3 font-medium text-muted-foreground">CA</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Cycles</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Occupation</th>
                <th className="p-3 font-medium text-muted-foreground w-32">Perf.</th>
              </tr>
            </thead>
            <tbody>
              {sortedMachines.map((machine, index) => (
                <tr key={machine.id} className={cn(
                  "border-b border-border/50 hover:bg-muted/30 transition-colors",
                  index === 0 && "bg-lime-50/50"
                )}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {machine.type === "washer" ? (
                        <WashingMachine className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Wind className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="font-medium">{machine.name}</span>
                      {index === 0 && (
                        <span className="text-xs bg-lime-100 text-lime-700 px-1.5 py-0.5 rounded">
                          Top
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {machine.revenue.toLocaleString('fr-FR')} €
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    {machine.cycles}
                  </td>
                  <td className="p-3 text-right">
                    <span className={cn(
                      "font-medium",
                      machine.occupancyRate >= 70 ? "text-lime-600" :
                      machine.occupancyRate >= 50 ? "text-amber-500" : "text-red-500"
                    )}>
                      {machine.occupancyRate}%
                    </span>
                  </td>
                  <td className="p-3">
                    <Progress 
                      value={(machine.revenue / maxRevenue) * 100} 
                      className="h-2 [&>div]:bg-primary" 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
