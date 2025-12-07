import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, Percent, Info, Plus, Trash2 } from "lucide-react";
import { SimulationProject, SimulationResults, FixedCostItem, VariableCostItem, SUBSCRIPTION_TYPES } from "@/types/simulation";

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

const FIXED_COST_CATEGORIES = [
  { id: 'rent', label: 'Loyer / Charges locatives' },
  { id: 'lease', label: 'Prêt / Leasing' },
  { id: 'subscription', label: 'Abonnement' },
  { id: 'insurance', label: 'Assurance' },
  { id: 'tax', label: 'Impôt / Taxe' },
  { id: 'salary', label: 'Salaire / Charges sociales' },
  { id: 'cleaning', label: 'Ménage / Entretien' },
  { id: 'other', label: 'Autre' },
] as const;

const VARIABLE_COST_CATEGORIES = [
  { id: 'electricity', label: 'Électricité' },
  { id: 'water', label: 'Eau' },
  { id: 'gas', label: 'Gaz' },
  { id: 'detergent', label: 'Lessive / Produits' },
  { id: 'other', label: 'Autre' },
] as const;

export function StepCosts({ project, results, onUpdate }: StepCostsProps) {
  
  // Charges fixes
  const updateFixedCost = (id: string, updates: Partial<FixedCostItem>) => {
    onUpdate({
      fixed_costs: project.fixed_costs.map(c => 
        c.id === id ? { ...c, ...updates } : c
      )
    });
  };

  const addFixedCost = (category: FixedCostItem['category'], label: string) => {
    const newCost: FixedCostItem = {
      id: `fixed_${Date.now()}`,
      label,
      amount: 0,
      category,
    };
    onUpdate({
      fixed_costs: [...project.fixed_costs, newCost]
    });
  };

  const removeFixedCost = (id: string) => {
    onUpdate({
      fixed_costs: project.fixed_costs.filter(c => c.id !== id)
    });
  };

  // Charges variables
  const updateVariableCost = (id: string, updates: Partial<VariableCostItem>) => {
    onUpdate({
      variable_costs: project.variable_costs.map(c => 
        c.id === id ? { ...c, ...updates } : c
      )
    });
  };

  const addVariableCost = (category: VariableCostItem['category'], label: string) => {
    const newCost: VariableCostItem = {
      id: `var_${Date.now()}`,
      label,
      percent: 0,
      category,
    };
    onUpdate({
      variable_costs: [...project.variable_costs, newCost]
    });
  };

  const removeVariableCost = (id: string) => {
    onUpdate({
      variable_costs: project.variable_costs.filter(c => c.id !== id)
    });
  };

  // Grouper les charges fixes par catégorie
  const subscriptions = project.fixed_costs.filter(c => c.category === 'subscription');
  const otherFixedCosts = project.fixed_costs.filter(c => c.category !== 'subscription');

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Charges et seuil de rentabilité</h2>
        <p className="text-muted-foreground mt-2">
          Valeurs indicatives pré-remplies – ajustez selon votre situation
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
            {/* Charges fixes hors abonnements */}
            {otherFixedCosts.map((cost) => (
              <div key={cost.id} className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">{cost.label}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Montant"
                      value={cost.amount || ''}
                      onChange={(e) => updateFixedCost(cost.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="flex-1"
                    />
                    <span className="self-center text-sm text-muted-foreground">€/mois</span>
                  </div>
                </div>
                {!['rent', 'charges', 'lease', 'insurance', 'cfe', 'cleaning'].includes(cost.id) && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeFixedCost(cost.id)}
                    className="self-end"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            {/* Section Abonnements */}
            <div className="pt-4 border-t">
              <Label className="font-semibold text-foreground mb-3 block">Abonnements</Label>
              {subscriptions.map((cost) => (
                <div key={cost.id} className="flex items-center gap-2 mb-2">
                  <Select
                    value={cost.label}
                    onValueChange={(value) => updateFixedCost(cost.id, { label: value })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIPTION_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.label}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Montant"
                    value={cost.amount || ''}
                    onChange={(e) => updateFixedCost(cost.id, { amount: parseFloat(e.target.value) || 0 })}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">€/mois</span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeFixedCost(cost.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addFixedCost('subscription', SUBSCRIPTION_TYPES[0].label)}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un abonnement
              </Button>
            </div>

            {/* Ajouter une charge fixe */}
            <div className="pt-4 border-t">
              <Label className="text-sm text-muted-foreground mb-2 block">Ajouter une charge fixe</Label>
              <div className="flex gap-2 flex-wrap">
                {FIXED_COST_CATEGORIES.filter(cat => cat.id !== 'subscription').map((cat) => (
                  <Button
                    key={cat.id}
                    variant="outline"
                    size="sm"
                    onClick={() => addFixedCost(cat.id as FixedCostItem['category'], cat.label)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {cat.label}
                  </Button>
                ))}
              </div>
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
            {project.variable_costs.map((cost) => (
              <div key={cost.id} className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">{cost.label}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="Pourcentage"
                      value={cost.percent || ''}
                      onChange={(e) => updateVariableCost(cost.id, { percent: parseFloat(e.target.value) || 0 })}
                      className="flex-1"
                    />
                    <span className="self-center text-sm text-muted-foreground">% du CA</span>
                  </div>
                </div>
                {!['electricity', 'water', 'gas', 'detergent'].includes(cost.id) && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeVariableCost(cost.id)}
                    className="self-end"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            {/* Ajouter une charge variable */}
            <div className="pt-4 border-t">
              <Label className="text-sm text-muted-foreground mb-2 block">Ajouter une charge variable</Label>
              <div className="flex gap-2 flex-wrap">
                {VARIABLE_COST_CATEGORIES.map((cat) => (
                  <Button
                    key={cat.id}
                    variant="outline"
                    size="sm"
                    onClick={() => addVariableCost(cat.id as VariableCostItem['category'], cat.label)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {cat.label}
                  </Button>
                ))}
              </div>
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
                Ordre de grandeur : électricité ~8-12%, eau ~3-5%, lessive ~3-5% du CA selon les équipements.
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
