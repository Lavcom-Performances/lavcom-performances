import { FormCard, CardContent } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

interface Props {
  capacity: number;
  count: number;
  price: number;
  cyclesPerDay: number;
  monthlyRevenue: number;
  unit?: "kg";
}

export function MachineCounter({ capacity, count, price, cyclesPerDay, monthlyRevenue }: Props) {
  return (
    <FormCard className="border-border bg-muted/20">
      <CardContent className="grid gap-3 p-4 md:grid-cols-[100px_1fr_1fr_1fr_auto] md:items-end">
        <div>
          <div className="text-lg font-semibold text-foreground">{capacity} kg</div>
          <div className="flex items-center gap-1 text-xs text-primary">
            <ArrowRight className="h-3 w-3" />
            {monthlyRevenue.toLocaleString("fr-FR")} €/mois
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nombre</Label>
          <Input type="number" defaultValue={count} min={0} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Prix (€)</Label>
          <Input type="number" step="0.5" defaultValue={price} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cycles/jour</Label>
          <Input type="number" defaultValue={cyclesPerDay} />
        </div>
      </CardContent>
    </FormCard>
  );
}
