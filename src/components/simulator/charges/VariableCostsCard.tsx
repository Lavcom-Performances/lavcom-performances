import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { CostRow } from "./CostRow";
import {
  addVariableCost,
  removeVariableCost,
  updateVariableCost,
} from "./types";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";

export function VariableCostsCard() {
  const { project, updateProject } = useSimulatorProjectContext();
  const items = project.variableCosts ?? [];
  const totalPercent = items.reduce((s, c) => s + (c.percent || 0), 0);

  return (
    <FormCard className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Charges variables
        </CardTitle>
        <CardDescription>Estimées en pourcentage du chiffre d'affaires</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((c) => (
          <CostRow
            key={c.id}
            label={c.label}
            value={c.percent}
            suffix="% du CA"
            placeholder="0"
            onChange={(v) => updateProject({ variableCosts: updateVariableCost(project.variableCosts, c.id, v) })}
            onRemove={() => updateProject({ variableCosts: removeVariableCost(project.variableCosts, c.id) })}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => updateProject({ variableCosts: addVariableCost(project.variableCosts) })}
        >
          <Plus className="h-4 w-4" />
          Ajouter une charge variable
        </Button>
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-foreground">Total charges variables</span>
          <span className="text-lg font-bold text-primary">
            {totalPercent.toFixed(1)} %
            <span className="ml-1 text-sm font-normal text-muted-foreground">du CA</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ordre de grandeur : électricité ~8-12%, eau ~3-5%, lessive ~3-5% du CA selon les
          équipements.
        </p>
      </CardContent>
    </FormCard>
  );
}
