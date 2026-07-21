import { Plus, Equal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";

export function MachineRevenueSummary() {
  const { project } = useSimulatorProjectContext();
  const washing = Math.round(project.washingRevenue ?? 0);
  const drying = Math.round(project.dryingRevenue ?? 0);
  const total = Math.round(project.totalRevenue ?? 0);

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex items-center justify-between h-full py-6 px-12">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">CA lavage</span>
          <span className="mt-1 text-xl text-foreground">
            {washing.toLocaleString("fr-FR")} €
          </span>
        </div>
        <span><Plus /></span>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">CA séchage</span>
          <span className="mt-1 text-xl text-foreground">
            {drying.toLocaleString("fr-FR")} €
          </span>
        </div>
        <span><Equal /></span>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-foreground">CA total estimé</span>
          <span className="mt-1 text-2xl font-bold text-primary">
            {total.toLocaleString("fr-FR")} €
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ mois</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
