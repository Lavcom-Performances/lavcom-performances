import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { CostRow } from "./CostRow";
import { MOCK_VARIABLE_COSTS, MOCK_VARIABLE_TOTAL_PERCENT } from "@/components/simulator/mockData";

export function VariableCostsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Charges variables
        </CardTitle>
        <CardDescription>Estimées en pourcentage du chiffre d'affaires</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {MOCK_VARIABLE_COSTS.map((c) => (
          <CostRow
            key={c.id}
            label={c.label}
            amount={c.percent || undefined}
            suffix="% du CA"
            placeholder="0"
          />
        ))}
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une charge variable
        </Button>
        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-foreground">Total charges variables</span>
          <span className="text-lg font-bold text-primary">
            {MOCK_VARIABLE_TOTAL_PERCENT.toFixed(1)} %
            <span className="ml-1 text-sm font-normal text-muted-foreground">du CA</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Ordre de grandeur : électricité ~8-12%, eau ~3-5%, lessive ~3-5% du CA selon les
          équipements.
        </p>
      </CardContent>
    </Card>
  );
}
