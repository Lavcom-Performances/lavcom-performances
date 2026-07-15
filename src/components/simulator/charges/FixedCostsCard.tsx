import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";
import { CostRow } from "./CostRow";
import {
  addFixedCost,
  removeFixedCost,
  updateFixedCost,
  type SimulatorChargesFormProps,
} from "./types";

export function FixedCostsCard({ project, onUpdate }: SimulatorChargesFormProps) {
  const items = project.fixedCosts ?? [];
  const total = items.reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <FormCard className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Charges fixes mensuelles
        </CardTitle>
        <CardDescription>Montants fixes à payer chaque mois</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((c) => (
          <CostRow
            key={c.id}
            label={c.label}
            value={c.amount}
            placeholder="0"
            onChange={(v) => onUpdate({ fixedCosts: updateFixedCost(project.fixedCosts, c.id, v) })}
            onRemove={() => onUpdate({ fixedCosts: removeFixedCost(project.fixedCosts, c.id) })}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => onUpdate({ fixedCosts: addFixedCost(project.fixedCosts) })}
        >
          <Plus className="h-4 w-4" />
          Ajouter une charge fixe
        </Button>
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-foreground">Total charges fixes</span>
          <span className="text-lg font-bold text-primary">
            {total.toLocaleString("fr-FR")} €
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ mois</span>
          </span>
        </div>
      </CardContent>
    </FormCard>
  );
}
