import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Button } from "@/components/ui/button";
import { Plus, Wind } from "lucide-react";
import { MachineCounter } from "./MachineCounter";
import {
  addMachine,
  machineMonthlyRevenue,
  removeMachine,
  updateMachineList,
} from "./types";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import type { MachineConfig } from "@/types/simulator.types";

export function DryersConfigCard() {
  const { project, updateProject } = useSimulatorProjectContext();
  const dryers = (project.machines ?? []).filter((m) => m.type === "dryer");
  const total = dryers.reduce((sum, m) => sum + machineMonthlyRevenue(m), 0);

  const patch = (id: string, p: Partial<MachineConfig>) =>
    updateProject({ machines: updateMachineList(project.machines, id, p) });

  return (
    <FormCard className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wind className="h-5 w-5 text-primary" />
          Sèche-linge
        </CardTitle>
        <CardDescription>Configurez vos sèche-linge</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {dryers.map((d) => (
          <MachineCounter
            key={d.id}
            capacity={d.capacity_kg}
            count={d.count}
            price={d.price}
            cyclesPerDay={d.cycles_day}
            monthlyRevenue={machineMonthlyRevenue(d)}
            onCountChange={(v) => patch(d.id, { count: v })}
            onPriceChange={(v) => patch(d.id, { price: v })}
            onCyclesChange={(v) => patch(d.id, { cycles_day: v })}
            onRemove={() => updateProject({ machines: removeMachine(project.machines, d.id) })}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => updateProject({ machines: addMachine(project.machines, "dryer") })}
        >
          <Plus className="h-4 w-4" />
          Ajouter un sèche-linge
        </Button>
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-foreground">CA séchage estimé</span>
          <span className="text-lg font-bold text-primary">
            {Math.round(total).toLocaleString("fr-FR")} € / mois
          </span>
        </div>
      </CardContent>
    </FormCard>
  );
}
