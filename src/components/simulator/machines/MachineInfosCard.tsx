import { FormCard, CardContent } from "@/components/ui/form-card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trash2 } from "lucide-react";
import { MACHINES_CAPACITIES } from "@/config/simulatorFormOptions";

interface Props {
  capacity: number;
  count: number;
  price: number;
  cyclesPerDay: number;
  monthlyRevenue: number;
  onCapacityChange?: (value: number) => void;
  onCountChange?: (value: number) => void;
  onPriceChange?: (value: number) => void;
  onCyclesChange?: (value: number) => void;
  onRemove?: () => void;
}

export function MachineInfosCard({
  capacity,
  count,
  price,
  cyclesPerDay,
  monthlyRevenue,
  onCapacityChange,
  onCountChange,
  onPriceChange,
  onCyclesChange,
  onRemove,
}: Props) {
  return (
    <FormCard className="border-border bg-muted/20">
      <CardContent className="flex flex-col gap-3 p-4">
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
            {monthlyRevenue.toLocaleString("fr-FR")} €/mois
          </div>
          {onRemove && (
            <Button variant="ghost" className="min-w-[40px]" size="icon" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input
              className="bg-white"
              type="number"
              value={count}
              min={0}
              onChange={(e) => onCountChange?.(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prix (€)</Label>
            <Input
              className="bg-white"
              type="number"
              step="0.5"
              value={price}
              onChange={(e) => onPriceChange?.(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Cycles/jour</Label>
            <Input
              className="bg-white"
              type="number"
              value={cyclesPerDay}
              onChange={(e) => onCyclesChange?.(Number(e.target.value))}
            />
          </div>
        </div>
      </CardContent>
    </FormCard>
  );
}
