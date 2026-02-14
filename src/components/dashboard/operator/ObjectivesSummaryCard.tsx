import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Target, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { KpiObjective } from "@/hooks/useKpiObjectives";

interface ObjectivesSummaryCardProps {
  globalObjective?: KpiObjective;
  categoryObjectives: KpiObjective[];
  currentRevenue: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  WASH: "Lavage",
  DRY: "Séchage",
  PRODUCT: "Produits",
  OPTION: "Options",
  SERVICE: "Services",
};

export function ObjectivesSummaryCard({ globalObjective, categoryObjectives, currentRevenue }: ObjectivesSummaryCardProps) {
  const { t } = useTranslation("app");
  const navigate = useNavigate();

  const globalCents = globalObjective?.objective_amount_cents ?? 0;
  const globalEuros = globalCents / 100;
  const achievedPct = globalEuros > 0 ? Math.min(Math.round((currentRevenue / globalEuros) * 100), 999) : 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v)) + " €";

  const hasObjectives = globalObjective || categoryObjectives.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">
            {t("operatorDashboard.objectives.title", { defaultValue: "Objectifs" })}
          </h2>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate("/settings/objectives")}>
          {hasObjectives 
            ? t("operatorDashboard.objectives.edit", { defaultValue: "Modifier" })
            : t("operatorDashboard.objectives.set", { defaultValue: "Définir" })
          }
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!hasObjectives ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground max-w-md">
              {t("operatorDashboard.objectives.empty", { 
                defaultValue: "Définissez un objectif mensuel pour un suivi plus clair et des recommandations plus pertinentes." 
              })}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/settings/objectives")}>
              {t("operatorDashboard.objectives.setCta", { defaultValue: "Définir mes objectifs" })}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Global objective */}
            {globalObjective && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Objectif global</span>
                  <span className="text-sm tabular-nums">
                    {formatCurrency(currentRevenue)} / {formatCurrency(globalEuros)}
                  </span>
                </div>
                <Progress value={achievedPct} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{achievedPct}% atteint</p>
              </div>
            )}

            {/* Category objectives */}
            {categoryObjectives.slice(0, 3).map(obj => (
              <div key={obj.id} className="flex items-center justify-between text-sm py-1.5 border-t">
                <span className="text-muted-foreground">{CATEGORY_LABELS[obj.category ?? ""] ?? obj.category}</span>
                <span className="font-medium tabular-nums">{formatCurrency(obj.objective_amount_cents / 100)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
