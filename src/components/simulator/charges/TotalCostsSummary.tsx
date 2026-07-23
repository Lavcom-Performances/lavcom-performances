import { Card, CardContent } from "@/components/ui/card";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";

// Mock data - à remplacer par les vraies données du projet si disponibles
const MOCK_MONTHLY_REVENUE = 15000; // CA mensuel estimé par défaut

export function TotalCostsSummary() {
  const { project } = useSimulatorProjectContext();
  
  // Calcul des totaux
  const fixedCostsTotal = (project.fixedCosts ?? []).reduce((s, c) => s + (c.amount || 0), 0);
  const variableCostsTotal = (project.variableCosts ?? []).reduce((s, c) => s + (c.percent || 0), 0);
  
  // Calcul du CA mensuel estimé (à partir des revenus machines ou mock)
  const monthlyRevenue = project.totalRevenue ?? MOCK_MONTHLY_REVENUE;
  
  // Calcul des charges variables en euros (basé sur le % du CA)
  const variableCostsInEuros = (monthlyRevenue * variableCostsTotal) / 100;
  
  // Total des charges (fixes + variables en euros)
  const totalCosts = fixedCostsTotal + variableCostsInEuros;

  return (
    <Card className="border-lavcom-orange/40 bg-lavcom-orange/10">
      <CardContent className="flex items-center justify-between h-full py-6 px-12">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Charges fixes</span>
          <span className="mt-1 text-xl text-foreground">
            {fixedCostsTotal.toLocaleString("fr-FR")} €
          </span>
        </div>
        <span className="text-muted-foreground">+</span>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Charges variables</span>
          <span className="mt-1 text-xl text-foreground">
            {variableCostsTotal.toFixed(1)} % ({Math.round(variableCostsInEuros).toLocaleString("fr-FR")} €)
          </span>
        </div>
        <span className="text-muted-foreground">=</span>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-foreground">Total charges</span>
          <span className="mt-1 text-2xl font-bold text-lavcom-orange">
            {Math.round(totalCosts).toLocaleString("fr-FR")} €
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ mois</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
