import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import { MOCK_BREAKEVEN } from "@/components/simulator/mockData";

export function ChargesTotalsBanner() {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Aperçu du seuil de rentabilité
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            CA mensuel estimé
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {MOCK_BREAKEVEN.monthlyRevenue.toLocaleString("fr-FR")} €
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Seuil de rentabilité
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {MOCK_BREAKEVEN.breakevenRevenue.toLocaleString("fr-FR")} €
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Cycles/jour nécessaires
          </div>
          <div className="mt-1 text-2xl font-bold text-primary">
            ≈ {MOCK_BREAKEVEN.cyclesPerDay.toFixed(1)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
