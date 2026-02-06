import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Calculator, Info, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFinProject } from "@/hooks/useFinProjects";
import { useFinHypotheses, useUpdateHypothesis, type FinHypothesis, type HypothesisCategory } from "@/hooks/useFinHypotheses";
import { useComputeForecast } from "@/hooks/useFinForecast";
import { useFinAccess } from "@/hooks/useFinAccess";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG: Record<HypothesisCategory, { title: string; description: string; color: string }> = {
  INVESTMENT: { 
    title: "Investissement", 
    description: "Coûts initiaux et amortissement",
    color: "border-l-blue-500"
  },
  REVENUE: { 
    title: "Revenus", 
    description: "Chiffre d'affaires et croissance",
    color: "border-l-green-500"
  },
  COST: { 
    title: "Charges", 
    description: "Charges fixes et variables",
    color: "border-l-orange-500"
  },
  FINANCING: { 
    title: "Financement", 
    description: "Emprunt et conditions",
    color: "border-l-purple-500"
  },
};

function HypothesisInput({ 
  hypothesis, 
  onUpdate,
  disabled 
}: { 
  hypothesis: FinHypothesis; 
  onUpdate: (value: number) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(
    (hypothesis.meta as { isPercentage?: boolean })?.isPercentage 
      ? (Number(hypothesis.value) * 100).toString() 
      : hypothesis.value.toString()
  );
  
  const isPercentage = (hypothesis.meta as { isPercentage?: boolean })?.isPercentage;

  const handleBlur = () => {
    let numValue = parseFloat(localValue) || 0;
    if (isPercentage) {
      numValue = numValue / 100;
    }
    if (numValue !== Number(hypothesis.value)) {
      onUpdate(numValue);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Label htmlFor={hypothesis.id} className="text-sm font-medium">
          {hypothesis.label || hypothesis.key}
        </Label>
      </div>
      <div className="w-32 relative">
        <Input
          id={hypothesis.id}
          type="number"
          value={localValue}
          onChange={e => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          className="pr-10 text-right"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {isPercentage ? "%" : hypothesis.unit?.replace("€", "€").replace("/mois", "") || ""}
        </span>
      </div>
    </div>
  );
}

export default function HypothesesPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  
  const { access } = useFinAccess();
  const { data: project } = useFinProject(projectId || undefined);
  const { data: hypotheses, isLoading } = useFinHypotheses(projectId || undefined);
  const updateHypothesis = useUpdateHypothesis();
  const computeForecast = useComputeForecast();
  
  const isReadOnly = access?.read_only || project?.status === "ARCHIVED";

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sélectionnez un projet pour modifier ses hypothèses.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const groupedHypotheses = hypotheses?.reduce((acc, h) => {
    if (!acc[h.category]) acc[h.category] = [];
    acc[h.category].push(h);
    return acc;
  }, {} as Record<HypothesisCategory, FinHypothesis[]>) || {};

  const handleUpdate = (id: string, value: number) => {
    if (!projectId) return;
    updateHypothesis.mutate({ id, value, projectId });
  };

  const handleComputeForecast = () => {
    if (!projectId) return;
    computeForecast.mutate({ projectId, horizonYears: 3 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hypothèses</h1>
          <p className="text-muted-foreground">
            {project?.name} — Définissez les paramètres de votre prévisionnel
          </p>
        </div>
        
        <Button 
          onClick={handleComputeForecast}
          disabled={computeForecast.isPending || isReadOnly}
        >
          <Calculator className="h-4 w-4 mr-2" />
          {computeForecast.isPending ? "Calcul..." : "Calculer le prévisionnel"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {(Object.keys(CATEGORY_CONFIG) as HypothesisCategory[]).map(category => {
          const config = CATEGORY_CONFIG[category];
          const items = groupedHypotheses[category] || [];
          
          return (
            <Card key={category} className={cn("border-l-4", config.color)}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune hypothèse</p>
                ) : (
                  items.map(h => (
                    <HypothesisInput
                      key={h.id}
                      hypothesis={h}
                      onUpdate={value => handleUpdate(h.id, value)}
                      disabled={isReadOnly}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Comment ça marche ?</p>
            <p className="mt-1">
              Les hypothèses que vous définissez ici servent de base au calcul de votre prévisionnel financier. 
              Cliquez sur "Calculer le prévisionnel" pour générer les projections sur 1 à 5 ans.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
