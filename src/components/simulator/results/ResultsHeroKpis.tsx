import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Euro, Pencil } from "lucide-react";
import { MOCK_REVENUE } from "@/components/simulator/mockData";

export function ResultsHeroKpis() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Euro className="h-5 w-5 text-primary" />
          Recettes estimées
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="gap-2 text-xs">
          <Link to="/simulator/machines">
            <Pencil className="h-3.5 w-3.5" />
            Modifier les machines
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            CA total estimé
          </div>
          <div className="mt-1 font-display text-4xl font-bold text-primary">
            {MOCK_REVENUE.total.toLocaleString("fr-FR")} €
          </div>
        </div>

        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="bg-primary"
            style={{ width: `${MOCK_REVENUE.washingShare}%` }}
            aria-label={`Lavage ${MOCK_REVENUE.washingShare}%`}
          />
          <div
            className="bg-primary/50"
            style={{ width: `${MOCK_REVENUE.dryingShare}%` }}
            aria-label={`Séchage ${MOCK_REVENUE.dryingShare}%`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              CA lavage ({MOCK_REVENUE.washingShare}%)
            </div>
            <div className="mt-1 text-lg font-bold text-foreground">
              {MOCK_REVENUE.washing.toLocaleString("fr-FR")} €
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary/50" />
              CA séchage ({MOCK_REVENUE.dryingShare}%)
            </div>
            <div className="mt-1 text-lg font-bold text-foreground">
              {MOCK_REVENUE.drying.toLocaleString("fr-FR")} €
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
