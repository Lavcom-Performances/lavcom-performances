import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calculator, 
  CheckCircle2, 
  Lock, 
  TrendingUp, 
  ArrowRight,
  Store,
  Building2,
  Warehouse,
  Users,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import { Footer } from "@/components/layout/Footer";
import { SIMULATOR_PLANS } from "@/config/pricingConfig";
import { SEOHead } from "@/components/seo/SEOHead";
import { cn } from "@/lib/utils";

// ===== CONSTANTES DE CALCUL =====
const HOURS_OPEN_DEFAULT = 14;

// Taux d'occupation par affluence
const AFFLUENCE_RATES = {
  low: 0.25,
  normal: 0.40,
  high: 0.55,
} as const;

// Durées de cycle (heures)
const WASH_CYCLE_HOURS = 1.0;
const DRY_CYCLE_HOURS = 0.5;

// Facteurs de demande par taille (les petites tournent plus)
const DEMAND_FACTORS = {
  washer: { small: 1.1, medium: 1.0, large: 0.85 },
  dryer: { small: 1.0, medium: 1.0, large: 0.95 },
} as const;

// Prix par défaut par taille (coefficients à appliquer au prix moyen)
const PRICE_COEFFICIENTS = {
  small: 0.7,
  medium: 1.0,
  large: 1.5,
} as const;

// ===== TYPES =====
type TemplateType = 'small' | 'standard' | 'large';
type AffluenceType = 'low' | 'normal' | 'high';
type MachineSize = 'small' | 'medium' | 'large';

interface MachineFleet {
  washers: { small: number; medium: number; large: number };
  dryers: { small: number; medium: number; large: number };
}

interface CustomPrices {
  washers: { small: number; medium: number; large: number };
  dryers: { small: number; medium: number; large: number };
}

interface SimulationState {
  surface: number;
  hoursOpen: number;
  template: TemplateType;
  machines: MachineFleet;
  affluence: AffluenceType;
  avgPriceWash: number;
  avgPriceDry: number;
  customPricesEnabled: boolean;
  customPrices: CustomPrices;
}

interface SimulationResults {
  dailyRevenue: number;
  monthlyRevenue: number;
  dailyWashRevenue: number;
  dailyDryRevenue: number;
  totalCyclesPerDay: number;
}

// ===== TEMPLATES =====
const TEMPLATES: Record<TemplateType, MachineFleet> = {
  small: {
    washers: { small: 2, medium: 1, large: 0 },
    dryers: { small: 1, medium: 1, large: 0 },
  },
  standard: {
    washers: { small: 2, medium: 3, large: 1 },
    dryers: { small: 1, medium: 2, large: 1 },
  },
  large: {
    washers: { small: 3, medium: 4, large: 2 },
    dryers: { small: 2, medium: 3, large: 2 },
  },
};

// Seuils de surface pour recommandation automatique du template
const SURFACE_THRESHOLDS = {
  small: { min: 0, max: 40 },      // < 40 m² → petite laverie
  standard: { min: 40, max: 70 },  // 40-70 m² → laverie standard
  large: { min: 70, max: Infinity }, // > 70 m² → grande laverie
} as const;

// Fonction pour déterminer le template recommandé selon la surface
function getRecommendedTemplate(surface: number): TemplateType {
  if (surface < SURFACE_THRESHOLDS.standard.min) return 'small';
  if (surface < SURFACE_THRESHOLDS.large.min) return 'standard';
  return 'large';
}

// ===== CALCUL =====
function calculateRevenue(state: SimulationState): SimulationResults {
  const occupancyRate = AFFLUENCE_RATES[state.affluence];
  
  // Cycles par machine par jour
  const washCyclesPerMachine = (state.hoursOpen * occupancyRate) / WASH_CYCLE_HOURS;
  const dryCyclesPerMachine = (state.hoursOpen * occupancyRate) / DRY_CYCLE_HOURS;
  
  // Prix par taille (custom ou dérivés du prix moyen)
  const washPrices = state.customPricesEnabled 
    ? state.customPrices.washers 
    : {
        small: state.avgPriceWash * PRICE_COEFFICIENTS.small,
        medium: state.avgPriceWash * PRICE_COEFFICIENTS.medium,
        large: state.avgPriceWash * PRICE_COEFFICIENTS.large,
      };
  
  const dryPrices = state.customPricesEnabled
    ? state.customPrices.dryers
    : {
        small: state.avgPriceDry * PRICE_COEFFICIENTS.small,
        medium: state.avgPriceDry * PRICE_COEFFICIENTS.medium,
        large: state.avgPriceDry * PRICE_COEFFICIENTS.large,
      };
  
  // Calcul CA lavage
  let dailyWashRevenue = 0;
  let totalWashCycles = 0;
  for (const size of ['small', 'medium', 'large'] as MachineSize[]) {
    const count = state.machines.washers[size];
    const price = washPrices[size];
    const factor = DEMAND_FACTORS.washer[size];
    const cycles = washCyclesPerMachine * factor * count;
    dailyWashRevenue += cycles * price;
    totalWashCycles += cycles;
  }
  
  // Calcul CA séchage
  let dailyDryRevenue = 0;
  let totalDryCycles = 0;
  for (const size of ['small', 'medium', 'large'] as MachineSize[]) {
    const count = state.machines.dryers[size];
    const price = dryPrices[size];
    const factor = DEMAND_FACTORS.dryer[size];
    const cycles = dryCyclesPerMachine * factor * count;
    dailyDryRevenue += cycles * price;
    totalDryCycles += cycles;
  }
  
  const dailyRevenue = dailyWashRevenue + dailyDryRevenue;
  
  return {
    dailyRevenue,
    monthlyRevenue: dailyRevenue * 30,
    dailyWashRevenue,
    dailyDryRevenue,
    totalCyclesPerDay: totalWashCycles + totalDryCycles,
  };
}

// ===== COMPOSANT STEPPER =====
function NumberStepper({ 
  value, 
  onChange, 
  min = 0, 
  max = 50,
  label 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  min?: number; 
  max?: number;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground min-w-0 flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center font-medium text-sm">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ===== COMPOSANT PRINCIPAL =====
export default function SimulateurPage() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const [showResults, setShowResults] = useState(false);
  const [customPricesOpen, setCustomPricesOpen] = useState(false);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  
  // Track if user has manually selected a template (to avoid overriding their choice)
  const userHasManuallySelectedTemplate = useRef(false);
  
  const [simulation, setSimulation] = useState<SimulationState>(() => {
    const initialSurface = 50;
    const recommendedTemplate = getRecommendedTemplate(initialSurface);
    return {
      surface: initialSurface,
      hoursOpen: HOURS_OPEN_DEFAULT,
      template: recommendedTemplate,
      machines: { ...TEMPLATES[recommendedTemplate] },
      affluence: 'normal',
      avgPriceWash: 5,
      avgPriceDry: 3,
      customPricesEnabled: false,
      customPrices: {
        washers: { small: 3.5, medium: 5, large: 7.5 },
        dryers: { small: 2, medium: 3, large: 4.5 },
      },
    };
  });
  
  // Auto-select template when surface changes (unless user manually selected one)
  useEffect(() => {
    if (userHasManuallySelectedTemplate.current) return;
    
    const recommendedTemplate = getRecommendedTemplate(simulation.surface);
    if (recommendedTemplate !== simulation.template) {
      setSimulation(prev => ({
        ...prev,
        template: recommendedTemplate,
        machines: { ...TEMPLATES[recommendedTemplate] },
      }));
    }
  }, [simulation.surface, simulation.template]);

  const results = useMemo(() => calculateRevenue(simulation), [simulation]);
  const paywallFeatures = t('app:simulateur.paywall.features', { returnObjects: true }) as string[];

  const handleTemplateChange = (template: TemplateType) => {
    // Mark that user has manually selected a template
    userHasManuallySelectedTemplate.current = true;
    setSimulation(prev => ({
      ...prev,
      template,
      machines: { ...TEMPLATES[template] },
    }));
  };
  
  // Handler for surface change that resets manual selection flag
  const handleSurfaceChange = (newSurface: number) => {
    // Reset the manual selection flag when user changes surface
    // This allows auto-selection to work again
    userHasManuallySelectedTemplate.current = false;
    setSimulation(prev => ({ ...prev, surface: newSurface }));
  };

  const updateMachineCount = (
    type: 'washers' | 'dryers', 
    size: MachineSize, 
    value: number
  ) => {
    setSimulation(prev => ({
      ...prev,
      machines: {
        ...prev.machines,
        [type]: {
          ...prev.machines[type],
          [size]: value,
        },
      },
    }));
  };

  const updateCustomPrice = (
    type: 'washers' | 'dryers',
    size: MachineSize,
    value: number
  ) => {
    setSimulation(prev => ({
      ...prev,
      customPrices: {
        ...prev.customPrices,
        [type]: {
          ...prev.customPrices[type],
          [size]: value,
        },
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(true);
    // Auto-scroll to results after a short delay to ensure render
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleUnlock = () => {
    navigate("/subscribe-simulator");
  };

  const templateIcons = {
    small: Store,
    standard: Building2,
    large: Warehouse,
  };

  const affluenceIcons = {
    low: Users,
    normal: Users,
    high: Users,
  };

  return (
    <>
      <SEOHead 
        title="Simulateur de rentabilité laverie"
        description="Simulez la rentabilité de votre projet de laverie automatique. Estimez votre chiffre d'affaires mensuel gratuitement avec notre outil de simulation."
        url="/simulateur"
        keywords="simulateur laverie, rentabilité laverie automatique, business plan laverie, ouverture laverie, estimation revenus laverie"
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={lavcomLogo} alt="Lavcom Analytics" className="h-10 w-auto" />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t('app:simulateur.nav.exploitantPricing')}
              </Link>
              <Link to="/login?mode=exploitant">
                <Button variant="ghost">{t('app:simulateur.nav.exploitantLogin')}</Button>
              </Link>
              <Link to="/login?mode=simulateur">
                <Button variant="outline" className="border-amber-600/50 text-amber-700 dark:text-amber-400 hover:bg-amber-600/10">
                  {t('app:simulateur.nav.simulatorLogin')}
                </Button>
              </Link>
            </nav>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-12">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold text-white mb-3 md:mb-4" style={{ backgroundColor: '#A5C800' }}>
              <Calculator className="h-3 w-3 md:h-4 md:w-4" />
              {t('app:simulateur.free')}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground mb-3 md:mb-4 leading-tight">
              {t('app:simulateur.title')}
            </h1>
            <p className="text-muted-foreground text-sm md:text-lg px-2">
              {t('app:simulateur.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {/* Formulaire */}
            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Infos de base */}
                <Card className="border-amber-500/30">
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <Calculator className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
                      {t('app:simulateur.form.title')}
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {t('app:simulateur.form.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="surface" className="text-xs md:text-sm">{t('app:simulateur.form.surface')}</Label>
                        <Input
                          id="surface"
                          type="number"
                          min={20}
                          max={500}
                          value={simulation.surface}
                          onChange={(e) => handleSurfaceChange(Number(e.target.value))}
                          className="h-9 md:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hoursOpen" className="text-xs md:text-sm">{t('app:simulateur.form.hoursOpen')}</Label>
                        <Input
                          id="hoursOpen"
                          type="number"
                          min={8}
                          max={24}
                          value={simulation.hoursOpen}
                          onChange={(e) => setSimulation(prev => ({ ...prev, hoursOpen: Number(e.target.value) }))}
                          className="h-9 md:h-10 text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Templates */}
                <Card className="border-amber-500/30">
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="text-base md:text-lg">{t('app:simulateur.machineFleet.title')}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {t('app:simulateur.machineFleet.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Template selector */}
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                      {(['small', 'standard', 'large'] as TemplateType[]).map((template) => {
                        const Icon = templateIcons[template];
                        const isSelected = simulation.template === template;
                        return (
                          <button
                            key={template}
                            type="button"
                            onClick={() => handleTemplateChange(template)}
                            className={cn(
                              "p-3 md:p-4 rounded-lg border-2 transition-all text-left",
                              isSelected 
                                ? "border-amber-500 bg-amber-500/10" 
                                : "border-border hover:border-amber-500/50"
                            )}
                          >
                            <Icon className={cn(
                              "h-5 w-5 md:h-6 md:w-6 mb-2",
                              isSelected ? "text-amber-600" : "text-muted-foreground"
                            )} />
                            <div className="font-medium text-xs md:text-sm">
                              {t(`app:simulateur.machineFleet.templates.${template}`)}
                            </div>
                            <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                              {t(`app:simulateur.machineFleet.templates.${template}Desc`)}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Machine counts */}
                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                      {/* Washers */}
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          🧺 {t('app:simulateur.machineFleet.washers')}
                        </h4>
                        <NumberStepper
                          value={simulation.machines.washers.small}
                          onChange={(v) => updateMachineCount('washers', 'small', v)}
                          label={`${t('app:simulateur.machineFleet.small')} (${t('app:simulateur.machineFleet.smallKg')})`}
                        />
                        <NumberStepper
                          value={simulation.machines.washers.medium}
                          onChange={(v) => updateMachineCount('washers', 'medium', v)}
                          label={`${t('app:simulateur.machineFleet.medium')} (${t('app:simulateur.machineFleet.mediumKg')})`}
                        />
                        <NumberStepper
                          value={simulation.machines.washers.large}
                          onChange={(v) => updateMachineCount('washers', 'large', v)}
                          label={`${t('app:simulateur.machineFleet.large')} (${t('app:simulateur.machineFleet.largeKg')})`}
                        />
                      </div>

                      {/* Dryers */}
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          🔥 {t('app:simulateur.machineFleet.dryers')}
                        </h4>
                        <NumberStepper
                          value={simulation.machines.dryers.small}
                          onChange={(v) => updateMachineCount('dryers', 'small', v)}
                          label={`${t('app:simulateur.machineFleet.small')} (${t('app:simulateur.machineFleet.dryerSmallKg')})`}
                        />
                        <NumberStepper
                          value={simulation.machines.dryers.medium}
                          onChange={(v) => updateMachineCount('dryers', 'medium', v)}
                          label={`${t('app:simulateur.machineFleet.medium')} (${t('app:simulateur.machineFleet.dryerMediumKg')})`}
                        />
                        <NumberStepper
                          value={simulation.machines.dryers.large}
                          onChange={(v) => updateMachineCount('dryers', 'large', v)}
                          label={`${t('app:simulateur.machineFleet.large')} (${t('app:simulateur.machineFleet.dryerLargeKg')})`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Affluence */}
                <Card className="border-amber-500/30">
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="text-base md:text-lg">{t('app:simulateur.affluence.title')}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {t('app:simulateur.affluence.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                      {(['low', 'normal', 'high'] as AffluenceType[]).map((affluence) => {
                        const isSelected = simulation.affluence === affluence;
                        const occupancy = Math.round(AFFLUENCE_RATES[affluence] * 100);
                        return (
                          <button
                            key={affluence}
                            type="button"
                            onClick={() => setSimulation(prev => ({ ...prev, affluence }))}
                            className={cn(
                              "p-3 md:p-4 rounded-lg border-2 transition-all text-center",
                              isSelected 
                                ? "border-amber-500 bg-amber-500/10" 
                                : "border-border hover:border-amber-500/50"
                            )}
                          >
                            <Users className={cn(
                              "h-5 w-5 md:h-6 md:w-6 mx-auto mb-2",
                              isSelected ? "text-amber-600" : "text-muted-foreground",
                              affluence === 'high' && "fill-current"
                            )} />
                            <div className="font-medium text-xs md:text-sm">
                              {t(`app:simulateur.affluence.${affluence}`)}
                            </div>
                            <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                              {t(`app:simulateur.affluence.${affluence}Desc`)}
                            </div>
                            <div className="text-[10px] text-amber-600 font-medium mt-1">
                              {occupancy}% occ.
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing */}
                <Card className="border-amber-500/30">
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="text-base md:text-lg">{t('app:simulateur.pricing.title')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="avgPriceWash" className="text-xs md:text-sm">{t('app:simulateur.pricing.avgPriceWash')}</Label>
                        <Input
                          id="avgPriceWash"
                          type="number"
                          min={1}
                          max={20}
                          step={0.5}
                          value={simulation.avgPriceWash}
                          onChange={(e) => setSimulation(prev => ({ ...prev, avgPriceWash: Number(e.target.value) }))}
                          className="h-9 md:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avgPriceDry" className="text-xs md:text-sm">{t('app:simulateur.pricing.avgPriceDry')}</Label>
                        <Input
                          id="avgPriceDry"
                          type="number"
                          min={1}
                          max={15}
                          step={0.5}
                          value={simulation.avgPriceDry}
                          onChange={(e) => setSimulation(prev => ({ ...prev, avgPriceDry: Number(e.target.value) }))}
                          className="h-9 md:h-10 text-sm"
                        />
                      </div>
                    </div>

                    {/* Custom prices collapsible */}
                    <Collapsible open={customPricesOpen} onOpenChange={setCustomPricesOpen}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          type="button"
                          className="w-full justify-between text-xs md:text-sm text-muted-foreground hover:text-foreground"
                        >
                          {t('app:simulateur.pricing.customizePrices')}
                          {customPricesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            id="enableCustomPrices"
                            checked={simulation.customPricesEnabled}
                            onChange={(e) => setSimulation(prev => ({ ...prev, customPricesEnabled: e.target.checked }))}
                            className="rounded"
                          />
                          <Label htmlFor="enableCustomPrices" className="text-xs md:text-sm cursor-pointer">
                            Activer les prix personnalisés
                          </Label>
                        </div>
                        
                        {simulation.customPricesEnabled && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h5 className="text-xs font-medium text-muted-foreground">Lavage (€)</h5>
                              {(['small', 'medium', 'large'] as MachineSize[]).map(size => (
                                <div key={size} className="flex items-center gap-2">
                                  <span className="text-xs min-w-16">{t(`app:simulateur.machineFleet.${size}`)}</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    step={0.5}
                                    value={simulation.customPrices.washers[size]}
                                    onChange={(e) => updateCustomPrice('washers', size, Number(e.target.value))}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="space-y-2">
                              <h5 className="text-xs font-medium text-muted-foreground">Séchage (€)</h5>
                              {(['small', 'medium', 'large'] as MachineSize[]).map(size => (
                                <div key={size} className="flex items-center gap-2">
                                  <span className="text-xs min-w-16">{t(`app:simulateur.machineFleet.${size}`)}</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={15}
                                    step={0.5}
                                    value={simulation.customPrices.dryers[size]}
                                    onChange={(e) => updateCustomPrice('dryers', size, Number(e.target.value))}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>

                <Button 
                  type="submit" 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  size="lg"
                >
                  <Calculator className="mr-2 h-5 w-5" />
                  {t('app:simulateur.form.submit')}
                </Button>
              </form>
            </div>

            {/* Résultats + Paywall */}
            <div className="space-y-6">
              {/* Résultats */}
              {showResults && (
                <Card ref={resultsRef} className="border-green-500/30 bg-green-500/5">
                  <CardHeader>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white mb-2 w-fit" style={{ backgroundColor: '#A5C800' }}>
                      <Calculator className="h-3 w-3" />
                      {t('app:simulateur.free')}
                    </div>
                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <TrendingUp className="h-5 w-5" />
                      {t('app:simulateur.results.title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* CA Journalier */}
                    <div className="p-4 rounded-lg bg-background border">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground text-sm">{t('app:simulateur.results.dailyRevenue')}</span>
                        <span className="text-xl font-bold text-foreground">
                          {Math.round(results.dailyRevenue).toLocaleString("fr-FR")} {t('app:simulateur.results.perDay')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('app:simulateur.results.breakdown', {
                          wash: Math.round(results.dailyWashRevenue),
                          dry: Math.round(results.dailyDryRevenue)
                        })}
                      </div>
                    </div>

                    {/* CA Mensuel */}
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-green-700 dark:text-green-400 font-medium">{t('app:simulateur.results.monthlyRevenue')}</span>
                        <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {Math.round(results.monthlyRevenue).toLocaleString("fr-FR")} {t('app:simulateur.results.perMonth')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('app:simulateur.results.cyclesPerDay', { total: Math.round(results.totalCyclesPerDay) })}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center pt-2 italic">
                      {t('app:simulateur.results.disclaimer')}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Paywall */}
              <Card className="border-primary/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <CardTitle>{t('app:simulateur.paywall.title')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {paywallFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    onClick={handleUnlock}
                    className="w-full"
                    size="lg"
                  >
                    {t('app:simulateur.paywall.cta')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    {t('app:simulateur.paywall.startingFrom')} {SIMULATOR_PLANS.simulator.price} {t('common:euroPerMonth')}
                  </p>
                </CardContent>
              </Card>

              {/* Note */}
              <Card className="bg-muted/30 border-muted">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>{t('app:simulateur.note.title')}</strong> {t('app:simulateur.note.content')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
