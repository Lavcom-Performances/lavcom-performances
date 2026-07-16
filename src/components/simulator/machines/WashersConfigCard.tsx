import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Button } from "@/components/ui/button";
import { Plus, WashingMachine } from "lucide-react";
import { MachineCounter } from "./MachineCounter";
import {
  addMachine,
  machineMonthlyRevenue,
  removeMachine,
  updateMachineList,
} from "./types";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import type { MachineConfig } from "@/types/simulator.types";

export function WashersConfigCard() {
  const { project, updateProject } = useSimulatorProjectContext();
  const washers = (project.machines ?? []).filter((m) => m.type === "washer");
  const total = washers.reduce((sum, m) => sum + machineMonthlyRevenue(m), 0);

  const patch = (id: string, p: Partial<MachineConfig>) =>
    updateProject({ machines: updateMachineList(project.machines, id, p) });

  return (
    <FormCard className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <WashingMachine className="h-5 w-5 text-primary" />
          Lave-linge
        </CardTitle>
        <CardDescription>Configurez vos machines à laver</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {washers.map((w) => (
          <MachineCounter
            key={w.id}
            capacity={w.capacity_kg}
            count={w.count}
            price={w.price}
            cyclesPerDay={w.cycles_day}
            monthlyRevenue={machineMonthlyRevenue(w)}
            onCountChange={(v) => patch(w.id, { count: v })}
            onPriceChange={(v) => patch(w.id, { price: v })}
            onCyclesChange={(v) => patch(w.id, { cycles_day: v })}
            onRemove={() => updateProject({ machines: removeMachine(project.machines, w.id) })}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => updateProject({ machines: addMachine(project.machines, "washer") })}
        >
          <Plus className="h-4 w-4" />
          Ajouter un lave-linge
        </Button>
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-foreground">CA lavage estimé</span>
          <span className="text-lg font-bold text-primary">
            {Math.round(total).toLocaleString("fr-FR")} € / mois
          </span>
        </div>
      </CardContent>
    </FormCard>
  );
}
