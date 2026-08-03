import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Plus } from "lucide-react";
import { MachineInfosCard } from "./MachineInfosCard";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { machineMonthlyRevenue, updateMachineList, removeMachine, addMachine } from "@/utils/machineRevenueCalculations";
import type { MachineConfig } from "@/types/simulator.types";
import { useSimulatorStepErrors } from "@/contexts/SimulatorStepContext";

interface ConfigProps {
  icon: LucideIcon;
  cardTitle: string;
  cardDescription: string;
  machineName: "lave-linge" | "sèche-linge";
  machineCat: "lavage" | "séchage";
  machineType: "washer" | "dryer";
}

export function MachinesConfigCard({
  icon: Icon,
  cardTitle,
  cardDescription,
  machineName,
  machineCat,
  machineType,
}: ConfigProps) {
  const { project, updateProject } = useSimulatorProjectContext();
  const machines = (project.machines ?? []).filter((machine) => machine.type === machineType);
  const total = machines.reduce((sum, machine) => sum + machineMonthlyRevenue(machine), 0);
  const { sections, errors } = useSimulatorStepErrors();
  const sectionName = `${machineType}s` as "washers" | "dryers";
  const section = sections[sectionName];
  const hasError = section && !section.isValid;
  const machineError = hasError ? errors[sectionName] : undefined;

  // Log optionnel pour vérification
  console.log(`[MachinesConfigCard] ${machineType}:`, { hasError, machineError });

  const patchMachineConfig = (id: string, patchedConfig: Partial<MachineConfig>) =>
    updateProject({ machines: updateMachineList(project.machines, id, patchedConfig) });

  return (
    <FormCard className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {cardTitle}
        </CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {machines.map((machine) => (
          <MachineInfosCard
            key={machine.id}
            capacity={machine.capacityKg}
            count={machine.count}
            price={machine.price}
            cyclesPerDay={machine.cyclesPerDay}
            monthlyRevenue={machineMonthlyRevenue(machine)}
            onCapacityChange={(value) => patchMachineConfig(machine.id, { capacityKg: value })}
            onCountChange={(value) => patchMachineConfig(machine.id, { count: value })}
            onPriceChange={(value) => patchMachineConfig(machine.id, { price: value })}
            onCyclesChange={(value) => patchMachineConfig(machine.id, { cyclesPerDay: value })}
            onRemove={machines.length > 1
              ? () => updateProject({ machines: removeMachine(project.machines, machine.id) })
              : undefined
            }
          />
        ))}
        { machineError && <span className="block text-destructive">{machineError}</span>}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => updateProject({ machines: addMachine(project.machines, machineType) })}
        >
          <Plus className="h-4 w-4" />
          Ajouter un {machineName}
        </Button>
        <div className="flex flex-col w-full items-center border rounded-lg border-primary/40 bg-primary/10 px-4 py-3">
          <span className="text-xs font-medium text-muted-foreground">CA {machineCat} estimé</span>
          <span className="text-lg font-bold text-primary">
            {Math.round(total).toLocaleString("fr-FR")} € / mois
          </span>
        </div>
      </CardContent>
    </FormCard>
  );
}
