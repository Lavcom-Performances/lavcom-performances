import { FormCard, CardContent } from "@/components/ui/form-card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { InputFieldsInfos } from "./InputFieldsInfos";
import { MACHINES_CAPACITIES } from "@/config/simulatorFormOptions";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { updateMachineList } from "@/utils/machineRevenueCalculations";
import { MachineConfig } from "@/types/simulator.types";
import { machineConfigSchema } from "@/lib/validation/simulatorProjectSchema";

interface Props {
  machineId: string;
  capacity: number;
  count: number;
  price: number;
  cyclesPerDay: number;
  monthlyRevenue: number;
  onCapacityChange?: (value: number) => void;
  onRemove?: () => void;
}

export function MachineInfosCard({
  machineId,
  capacity,
  count,
  price,
  cyclesPerDay,
  monthlyRevenue,
  onCapacityChange,
  onRemove,
}: Props) {
  const { t } = useTranslation("paid-simulator");
  const { project, updateProject } = useSimulatorProjectContext();
  const patchMachineConfig = (id: string, patchedConfig: Partial<MachineConfig>) =>
      updateProject({ machines: updateMachineList(project.machines, id, patchedConfig) });

  const machineValidation = machineConfigSchema.safeParse(
    project.machines.find(machine => machine.id === machineId)
  );

  const errors = !machineValidation.success ? machineValidation.error : undefined;
  const formattedErrors = errors?.format() || undefined;

  return (
    <FormCard className="border-border bg-muted/20">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex justify-start gap-2 w-full">
          <Select defaultValue={capacity.toString()} onValueChange={(e) => onCapacityChange?.(Number(e))}>
            <SelectTrigger
              id="capacity"
              className="bg-white shadow-form text-md text-foreground w-[150px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {MACHINES_CAPACITIES.map((value) => (
                  <SelectItem key={value} value={value.toString()}>
                    {value} kg
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 text-xs text-primary w-full">
            <ArrowRight className="h-3 w-3" />
            {`${monthlyRevenue.toLocaleString("fr-FR")} ${t("common.euroPerMonth")}`}
          </div>
          {onRemove && (
            <Button variant="ghost" className="min-w-[40px]" size="icon" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
        <InputFieldsInfos
          count={count}
          price={price}
          cyclesPerDay={cyclesPerDay}
          errors={formattedErrors}
          onCountChange={(value) => patchMachineConfig(machineId, { count: value })}
          onPriceChange={(value) => patchMachineConfig(machineId, { price: value })}
          onCyclesChange={(value) => patchMachineConfig(machineId, { cyclesPerDay: value })}
        />
      </CardContent>
    </FormCard>
  );
}
