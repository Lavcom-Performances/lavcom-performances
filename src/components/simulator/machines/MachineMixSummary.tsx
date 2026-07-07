import { Card, CardContent } from "@/components/ui/card";
import { MOCK_REVENUE } from "@/components/simulator/mockData";

export function MachineMixSummary() {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="grid gap-6 p-6 md:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">CA lavage</div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {MOCK_REVENUE.washing.toLocaleString("fr-FR")} €
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">CA séchage</div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {MOCK_REVENUE.drying.toLocaleString("fr-FR")} €
          </div>
        </div>
        <div className="md:text-right">
          <div className="text-xs uppercase tracking-wider text-primary">CA total estimé</div>
          <div className="mt-1 text-2xl font-bold text-primary">
            {MOCK_REVENUE.total.toLocaleString("fr-FR")} €
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ mois</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
