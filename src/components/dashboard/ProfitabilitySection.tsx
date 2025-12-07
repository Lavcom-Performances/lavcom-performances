import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, AlertCircle, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfitabilityMetrics, hasCostsData, LaundryCosts } from "@/types/costs";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ProfitabilitySectionProps {
  metrics: ProfitabilityMetrics | null;
  costs: LaundryCosts | null;
  className?: string;
}

export function ProfitabilitySection({ metrics, costs, className }: ProfitabilitySectionProps) {
  const hasCosts = costs && hasCostsData(costs);
  
  if (!hasCosts || !metrics) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            Rentabilité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Aucune donnée de charges. Renseignez vos coûts dans les paramètres de la laverie.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/laundromat-settings">
                Configurer les charges
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isProfitable = metrics.estimated_profit_month >= 0;
  
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      {/* Carte Seuil de rentabilité */}
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Seuil de rentabilité (CA mensuel)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">
            {metrics.break_even_revenue_monthly !== null 
              ? `${metrics.break_even_revenue_monthly.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
              : 'N/A'
            }
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Basé sur vos charges saisies dans l'onglet "Charges / Coûts".
          </p>
          {metrics.break_even_cycles_day !== null && (
            <p className="text-sm text-primary/80 mt-2 font-medium">
              ≈ {Math.ceil(metrics.break_even_cycles_day)} cycles / jour nécessaires
            </p>
          )}
        </CardContent>
      </Card>

      {/* Carte Résultat estimé */}
      <Card className={cn(
        "border-l-4",
        isProfitable 
          ? "border-l-[#A5C800] bg-[#A5C800]/5" 
          : "border-l-destructive bg-destructive/5"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {isProfitable ? (
              <TrendingUp className="h-5 w-5 text-[#A5C800]" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            Résultat estimé (mois en cours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn(
            "text-3xl font-bold",
            isProfitable ? "text-[#A5C800]" : "text-destructive"
          )}>
            {metrics.estimated_profit_month >= 0 ? '+' : ''}
            {metrics.estimated_profit_month.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </p>
          <p className={cn(
            "text-sm mt-2 font-medium",
            isProfitable ? "text-[#A5C800]/80" : "text-destructive/80"
          )}>
            {isProfitable ? "Au-dessus du seuil" : "En dessous du seuil"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Estimation : CA – charges variables – charges fixes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
