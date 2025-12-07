import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, Percent, Info } from "lucide-react";
import { SimulationProject, SimulationResults } from "@/types/simulation";
import { FixedCosts, VariableCosts } from "@/types/costs";

interface StepCostsProps {
  project: SimulationProject;
  results: SimulationResults;
  onUpdate: (updates: Partial<SimulationProject>) => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export function StepCosts({ project, results, onUpdate }: StepCostsProps) {
  const updateCost = (field: keyof (FixedCosts & VariableCosts), value: number) => {
    onUpdate({
      costs: {
        ...project.costs,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Charges et seuil de rentabilité</h2>
        <p className="text-muted-foreground mt-2">
          Estimez vos charges fixes et variables pour calculer votre seuil de rentabilité
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Charges fixes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Charges fixes mensuelles
            </CardTitle>
            <CardDescription>
              Montants fixes à payer chaque mois
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fixed_rent">Loyer + charges (€/mois)</Label>
              <Input
                id="fixed_rent"
                type="number"
                min="0"
                placeholder="Ex: 1500"
                value={project.costs.fixed_rent || ''}
                onChange={(e) => updateCost('fixed_rent', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixed_lease">Prêt / leasing machines (€/mois)</Label>
              <Input
                id="fixed_lease"
                type="number"
                min="0"
                placeholder="Ex: 800"
                value={project.costs.fixed_lease || ''}
                onChange={(e) => updateCost('fixed_lease', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixed_subscriptions">Abonnements (centrale, internet, alarmes...) (€/mois)</Label>
              <Input
                id="fixed_subscriptions"
                type="number"
                min="0"
                placeholder="Ex: 200"
                value={project.costs.fixed_subscriptions || ''}
                onChange={(e) => updateCost('fixed_subscriptions', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixed_insurance">Assurances (€/mois)</Label>
              <Input
                id="fixed_insurance"
                type="number"
                min="0"
                placeholder="Ex: 150"
                value={project.costs.fixed_insurance || ''}
                onChange={(e) => updateCost('fixed_insurance', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixed_cleaning">Ménage / entretien (€/mois)</Label>
              <Input
                id="fixed_cleaning"
                type="number"
                min="0"
                placeholder="Ex: 300"
                value={project.costs.fixed_cleaning || ''}
                onChange={(e) => updateCost('fixed_cleaning', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixed_other">Autres charges fixes (€/mois)</Label>
              <Input
                id="fixed_other"
                type="number"
                min="0"
                placeholder="Ex: 100"
                value={project.costs.fixed_other || ''}
                onChange={(e) => updateCost('fixed_other', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="p-4 rounded-lg bg-muted text-center mt-4">
              <p className="text-sm text-muted-foreground">Total charges fixes</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(results.fixed_costs_total)}
              </p>
              <p className="text-xs text-muted-foreground">/ mois</p>
            </div>
          </CardContent>
        </Card>

        {/* Charges variables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Charges variables
            </CardTitle>
            <CardDescription>
              Estimées en pourcentage du chiffre d'affaires
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="var_energy">Électricité + eau (% du CA)</Label>
              <Input
                id="var_energy"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="Ex: 15"
                value={project.costs.var_energy_water_percent || ''}
                onChange={(e) => updateCost('var_energy_water_percent', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="var_detergent">Lessive / produits (% du CA)</Label>
              <Input
                id="var_detergent"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="Ex: 5"
                value={project.costs.var_detergent_percent || ''}
                onChange={(e) => updateCost('var_detergent_percent', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="p-4 rounded-lg bg-muted text-center mt-4">
              <p className="text-sm text-muted-foreground">Total charges variables</p>
              <p className="text-2xl font-bold text-foreground">
                {results.var_total_percent.toFixed(1)} %
              </p>
              <p className="text-xs text-muted-foreground">du CA</p>
            </div>

            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Ces données servent à estimer votre seuil de rentabilité. Les valeurs peuvent être approximatives et varient selon les régions et les équipements.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Aperçu rentabilité */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle>Aperçu du seuil de rentabilité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">CA mensuel estimé</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(results.project_turnover_month)}
              </p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Seuil de rentabilité</p>
              <p className="text-2xl font-bold text-foreground">
                {results.break_even_revenue_monthly 
                  ? formatCurrency(results.break_even_revenue_monthly)
                  : 'N/A'}
              </p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Cycles/jour nécessaires</p>
              <p className="text-2xl font-bold text-foreground">
                {results.break_even_cycles_day !== null 
                  ? `≈ ${results.break_even_cycles_day.toFixed(1)}`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
