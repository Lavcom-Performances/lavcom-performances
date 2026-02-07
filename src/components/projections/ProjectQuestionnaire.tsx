import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, Sparkles, AlertTriangle, MapPin, Maximize2, WashingMachine, Euro, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export interface QuestionnaireData {
  city: string;
  country: string;
  surface_size: "small" | "medium" | "large";
  machine_count_range: "1-4" | "5-8" | "9-14" | "15+";
  pricing_tier: "economic" | "standard" | "premium";
  project_mode: "side_income" | "main_project";
  has_loan: boolean;
  contribution_amount: number;
}

interface ProjectQuestionnaireProps {
  projectId: string;
  onComplete: () => void;
}

const STEPS = [
  { id: "location", title: "Localisation", icon: MapPin },
  { id: "surface", title: "Surface", icon: Maximize2 },
  { id: "machines", title: "Machines", icon: WashingMachine },
  { id: "pricing", title: "Positionnement", icon: Euro },
  { id: "goal", title: "Objectif", icon: Target },
  { id: "financing", title: "Financement", icon: Wallet },
];

const SURFACE_OPTIONS = [
  { value: "small", label: "Petite", description: "< 30 m² — 4-6 machines" },
  { value: "medium", label: "Moyenne", description: "30-60 m² — 6-10 machines" },
  { value: "large", label: "Grande", description: "> 60 m² — 10+ machines" },
];

const MACHINE_OPTIONS = [
  { value: "1-4", label: "1 à 4 machines" },
  { value: "5-8", label: "5 à 8 machines" },
  { value: "9-14", label: "9 à 14 machines" },
  { value: "15+", label: "15 machines ou plus" },
];

const PRICING_OPTIONS = [
  { value: "economic", label: "Économique", description: "Prix bas, volume élevé" },
  { value: "standard", label: "Standard", description: "Prix du marché, équilibré" },
  { value: "premium", label: "Premium", description: "Prix élevé, services haut de gamme" },
];

export function ProjectQuestionnaire({ projectId, onComplete }: ProjectQuestionnaireProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<QuestionnaireData>({
    city: "",
    country: "France",
    surface_size: "medium",
    machine_count_range: "5-8",
    pricing_tier: "standard",
    project_mode: "side_income",
    has_loan: true,
    contribution_amount: 30000,
  });

  const updateData = <K extends keyof QuestionnaireData>(key: K, value: QuestionnaireData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.city.trim().length > 0;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Update project with questionnaire data
      const { error } = await supabase
        .from("fin_projects")
        .update({
          questionnaire_completed: true,
          project_mode: data.project_mode,
          questionnaire_data: JSON.parse(JSON.stringify(data)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (error) throw error;

      // Initialize line items based on questionnaire
      await initializeLineItemsFromQuestionnaire(projectId, data);

      // Initialize hypotheses based on questionnaire
      await initializeHypothesesFromQuestionnaire(projectId, data);

      queryClient.invalidateQueries({ queryKey: ["fin-project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["fin-line-items", projectId] });
      queryClient.invalidateQueries({ queryKey: ["fin-hypotheses", projectId] });

      toast({ title: "Configuration terminée", description: "Vos hypothèses ont été pré-remplies." });
      onComplete();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Location
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ville du projet</Label>
              <Input
                id="city"
                placeholder="Lyon, Paris, Marseille..."
                value={data.city}
                onChange={e => updateData("city", e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                value={data.country}
                onChange={e => updateData("country", e.target.value)}
              />
            </div>
          </div>
        );

      case 1: // Surface
        return (
          <RadioGroup
            value={data.surface_size}
            onValueChange={v => updateData("surface_size", v as typeof data.surface_size)}
            className="space-y-3"
          >
            {SURFACE_OPTIONS.map(opt => (
              <div
                key={opt.value}
                className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  data.surface_size === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}
                onClick={() => updateData("surface_size", opt.value as typeof data.surface_size)}
              >
                <RadioGroupItem value={opt.value} id={opt.value} />
                <Label htmlFor={opt.value} className="flex-1 cursor-pointer">
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-muted-foreground ml-2">— {opt.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 2: // Machines
        return (
          <RadioGroup
            value={data.machine_count_range}
            onValueChange={v => updateData("machine_count_range", v as typeof data.machine_count_range)}
            className="space-y-3"
          >
            {MACHINE_OPTIONS.map(opt => (
              <div
                key={opt.value}
                className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  data.machine_count_range === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}
                onClick={() => updateData("machine_count_range", opt.value as typeof data.machine_count_range)}
              >
                <RadioGroupItem value={opt.value} id={`machine-${opt.value}`} />
                <Label htmlFor={`machine-${opt.value}`} className="flex-1 cursor-pointer font-medium">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 3: // Pricing
        return (
          <RadioGroup
            value={data.pricing_tier}
            onValueChange={v => updateData("pricing_tier", v as typeof data.pricing_tier)}
            className="space-y-3"
          >
            {PRICING_OPTIONS.map(opt => (
              <div
                key={opt.value}
                className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  data.pricing_tier === opt.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}
                onClick={() => updateData("pricing_tier", opt.value as typeof data.pricing_tier)}
              >
                <RadioGroupItem value={opt.value} id={`pricing-${opt.value}`} />
                <Label htmlFor={`pricing-${opt.value}`} className="flex-1 cursor-pointer">
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-muted-foreground ml-2">— {opt.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 4: // Goal
        return (
          <div className="space-y-4">
            <RadioGroup
              value={data.project_mode}
              onValueChange={v => updateData("project_mode", v as typeof data.project_mode)}
              className="space-y-3"
            >
              <div
                className={cn(
                  "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  data.project_mode === "side_income" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}
                onClick={() => updateData("project_mode", "side_income")}
              >
                <RadioGroupItem value="side_income" id="side_income" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="side_income" className="cursor-pointer">
                    <span className="font-medium">Complément de revenu</span>
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Recommandé</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pas de salaire dirigeant. KPIs orientés cash net et rentabilité passive.
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  data.project_mode === "main_project" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                )}
                onClick={() => updateData("project_mode", "main_project")}
              >
                <RadioGroupItem value="main_project" id="main_project" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="main_project" className="cursor-pointer">
                    <span className="font-medium">Projet principal</span>
                    <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Avancé</span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Inclut rémunération dirigeant et services complémentaires.
                  </p>
                </div>
              </div>
            </RadioGroup>

            {data.project_mode === "main_project" && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Attention</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Une laverie comme activité principale nécessite un volume élevé et des services complémentaires. 
                    Les hypothèses seront plus exigeantes.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 5: // Financing
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contribution">Apport personnel</Label>
              <div className="relative">
                <Input
                  id="contribution"
                  type="number"
                  value={data.contribution_amount}
                  onChange={e => updateData("contribution_amount", Number(e.target.value))}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Besoin d'un emprunt ?</Label>
              <RadioGroup
                value={data.has_loan ? "yes" : "no"}
                onValueChange={v => updateData("has_loan", v === "yes")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="loan-yes" />
                  <Label htmlFor="loan-yes">Oui</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="loan-no" />
                  <Label htmlFor="loan-no">Non, 100% apport</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const CurrentIcon = STEPS[currentStep].icon;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step, idx) => (
          <div
            key={step.id}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
              idx === currentStep
                ? "bg-primary text-primary-foreground"
                : idx < currentStep
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {idx + 1}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <CurrentIcon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>
            {currentStep === 0 && "Où se situera votre laverie ?"}
            {currentStep === 1 && "Quelle taille de local envisagez-vous ?"}
            {currentStep === 2 && "Combien de machines souhaitez-vous installer ?"}
            {currentStep === 3 && "Quel positionnement prix ?"}
            {currentStep === 4 && "Quel est l'objectif de ce projet ?"}
            {currentStep === 5 && "Comment comptez-vous financer le projet ?"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canProceed() || isSubmitting}
        >
          {currentStep === STEPS.length - 1 ? (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {isSubmitting ? "Génération..." : "Générer le prévisionnel"}
            </>
          ) : (
            <>
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Helper to generate line items based on questionnaire
async function initializeLineItemsFromQuestionnaire(projectId: string, data: QuestionnaireData) {
  // Delete existing items first
  await supabase.from("fin_line_items").delete().eq("project_id", projectId);

  // Calculate machine counts based on questionnaire
  const machineCount = getMachineCount(data.machine_count_range);
  const pricing = getPricing(data.pricing_tier);

  const items: any[] = [];
  let sortOrder = 0;

  // Washers (60% of machines)
  const washerCount = Math.max(1, Math.round(machineCount * 0.6));
  
  // 8kg washers (60% of washers)
  const washer8kg = Math.max(1, Math.round(washerCount * 0.6));
  if (washer8kg > 0) {
    items.push({
      project_id: projectId,
      category: "CYCLE",
      item_type: "Washer",
      capacity_kg: 8,
      label: "Lave-linge 8kg",
      quantity: washer8kg,
      price_ttc_cents: pricing.washer8kg,
      cycles_per_day_per_unit: 8,
      open_days_per_month: 26,
      utilization_rate: 0.65,
      sort_order: sortOrder++,
    });
  }

  // 12kg washers (30% of washers)
  const washer12kg = Math.max(0, Math.round(washerCount * 0.3));
  if (washer12kg > 0) {
    items.push({
      project_id: projectId,
      category: "CYCLE",
      item_type: "Washer",
      capacity_kg: 12,
      label: "Lave-linge 12kg",
      quantity: washer12kg,
      price_ttc_cents: pricing.washer12kg,
      cycles_per_day_per_unit: 6,
      open_days_per_month: 26,
      utilization_rate: 0.55,
      sort_order: sortOrder++,
    });
  }

  // 18kg washer (10% of washers, at least 1 if > 6 machines total)
  if (machineCount > 6) {
    items.push({
      project_id: projectId,
      category: "CYCLE",
      item_type: "Washer",
      capacity_kg: 18,
      label: "Lave-linge 18kg",
      quantity: 1,
      price_ttc_cents: pricing.washer18kg,
      cycles_per_day_per_unit: 4,
      open_days_per_month: 26,
      utilization_rate: 0.45,
      sort_order: sortOrder++,
    });
  }

  // Dryers (40% of machines)
  const dryerCount = Math.max(1, Math.round(machineCount * 0.4));
  items.push({
    project_id: projectId,
    category: "CYCLE",
    item_type: "Dryer",
    capacity_kg: 14,
    label: "Sèche-linge 14kg",
    quantity: dryerCount,
    price_ttc_cents: pricing.dryer14kg,
    cycles_per_day_per_unit: 10,
    open_days_per_month: 26,
    utilization_rate: 0.70,
    sort_order: sortOrder++,
  });

  // Products
  items.push({
    project_id: projectId,
    category: "PRODUCT",
    item_type: "Product",
    label: "Lessive (sachet)",
    quantity: 1,
    price_ttc_cents: pricing.detergent,
    cycles_per_day_per_unit: Math.round(machineCount * 2),
    open_days_per_month: 26,
    utilization_rate: 1.0,
    sort_order: sortOrder++,
  });

  // Options
  items.push({
    project_id: projectId,
    category: "OPTION",
    item_type: "Option",
    label: "Essorage supplémentaire",
    quantity: 1,
    price_ttc_cents: pricing.extraSpin,
    cycles_per_day_per_unit: Math.round(machineCount * 0.5),
    open_days_per_month: 26,
    utilization_rate: 1.0,
    sort_order: sortOrder++,
  });

  await supabase.from("fin_line_items").insert(items);
}

// Helper to generate hypotheses based on questionnaire
async function initializeHypothesesFromQuestionnaire(projectId: string, data: QuestionnaireData) {
  // Delete existing hypotheses first
  await supabase.from("fin_hypotheses").delete().eq("project_id", projectId);

  const machineCount = getMachineCount(data.machine_count_range);
  const investmentPerMachine = getInvestmentPerMachine(data.surface_size);
  const totalInvestment = machineCount * investmentPerMachine;
  
  const loanAmount = data.has_loan ? Math.max(0, totalInvestment - data.contribution_amount) : 0;
  const fixedCosts = getFixedCosts(data.surface_size);

  type HypCategory = "INVESTMENT" | "REVENUE" | "COST" | "FINANCING";
  
  const hypotheses: Array<{
    category: HypCategory;
    key: string;
    value: number;
    label: string;
    unit: string;
    meta: Record<string, boolean>;
  }> = [
    // Investment
    { category: "INVESTMENT", key: "initial_investment", value: totalInvestment, label: "Investissement initial", unit: "€", meta: {} },
    { category: "INVESTMENT", key: "depreciation_years", value: 7, label: "Durée d'amortissement", unit: "ans", meta: {} },
    
    // Revenue (calculated from line items, but we store growth rate)
    { category: "REVENUE", key: "annual_growth_rate", value: 0.03, label: "Croissance annuelle", unit: "%", meta: { isPercentage: true } },
    
    // Costs
    { category: "COST", key: "fixed_costs", value: fixedCosts, label: "Charges fixes mensuelles", unit: "€/mois", meta: {} },
    { category: "COST", key: "variable_cost_rate", value: 0.12, label: "Taux de charges variables", unit: "%", meta: { isPercentage: true } },
    { category: "COST", key: "water_cost_per_cycle", value: 0.25, label: "Coût eau / cycle", unit: "€", meta: {} },
    { category: "COST", key: "electricity_cost_per_cycle", value: 0.35, label: "Coût électricité / cycle", unit: "€", meta: {} },
    
    // Financing
    { category: "FINANCING", key: "contribution", value: data.contribution_amount, label: "Apport personnel", unit: "€", meta: {} },
    { category: "FINANCING", key: "loan_amount", value: loanAmount, label: "Montant du prêt", unit: "€", meta: {} },
    { category: "FINANCING", key: "loan_rate", value: 0.045, label: "Taux d'intérêt", unit: "%", meta: { isPercentage: true } },
    { category: "FINANCING", key: "loan_years", value: 7, label: "Durée du prêt", unit: "ans", meta: {} },
  ];

  // Add manager salary only for main_project mode
  if (data.project_mode === "main_project") {
    hypotheses.push({
      category: "COST",
      key: "manager_salary",
      value: 2000,
      label: "Rémunération dirigeant",
      unit: "€/mois",
      meta: {},
    });
  }

  await supabase.from("fin_hypotheses").insert(
    hypotheses.map(h => ({ ...h, project_id: projectId }))
  );
}

function getMachineCount(range: string): number {
  switch (range) {
    case "1-4": return 3;
    case "5-8": return 7;
    case "9-14": return 11;
    case "15+": return 16;
    default: return 7;
  }
}

function getInvestmentPerMachine(surface: string): number {
  switch (surface) {
    case "small": return 12000;
    case "medium": return 11000;
    case "large": return 10000;
    default: return 11000;
  }
}

function getFixedCosts(surface: string): number {
  switch (surface) {
    case "small": return 800;
    case "medium": return 1200;
    case "large": return 1800;
    default: return 1200;
  }
}

function getPricing(tier: string): Record<string, number> {
  switch (tier) {
    case "economic":
      return {
        washer8kg: 400,
        washer12kg: 550,
        washer18kg: 750,
        dryer14kg: 150,
        detergent: 100,
        extraSpin: 50,
      };
    case "standard":
      return {
        washer8kg: 500,
        washer12kg: 700,
        washer18kg: 1000,
        dryer14kg: 200,
        detergent: 150,
        extraSpin: 100,
      };
    case "premium":
      return {
        washer8kg: 650,
        washer12kg: 900,
        washer18kg: 1300,
        dryer14kg: 300,
        detergent: 200,
        extraSpin: 150,
      };
    default:
      return getPricing("standard");
  }
}
