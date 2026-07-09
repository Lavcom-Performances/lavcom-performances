import { FormCard, CardContent, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock, Pencil, TrendingUp } from "lucide-react";

export function PartialInsightsList() {
  return (
    <FormCard className="">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Rentabilité
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="gap-2 text-xs">
          <Link to="/simulator/charges">
            <Pencil className="h-3.5 w-3.5" />
            Modifier les charges
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Résultat estimé
          </div>
          <div className="mt-1 flex items-center justify-center gap-2 font-display text-4xl font-bold text-muted-foreground">
            <Lock className="h-6 w-6" />
            <span className="blur-sm">1 240 €</span>
            <span className="text-sm font-normal">/ mois</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">* Estimation indicative</div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Seuil de rentabilité
            </div>
            <div className="mt-1 flex items-center gap-2 text-lg font-bold text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="blur-sm">3 171 €</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Cycles/jour nécessaires
            </div>
            <div className="mt-1 flex items-center gap-2 text-lg font-bold text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="blur-sm">≈ 23</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-center text-sm font-medium text-primary">
          ✓ Projet au-dessus du seuil de rentabilité
        </div>
      </CardContent>
    </FormCard>
  );
}
