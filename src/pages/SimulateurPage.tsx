import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Calculator, 
  CheckCircle2, 
  Lock, 
  TrendingUp, 
  ArrowRight
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import { translations } from "@/lib/i18n";
import { WASHER_CAPACITIES, DRYER_CAPACITIES } from "@/types/simulation";
import { SIMULATOR_PLANS } from "@/config/pricingConfig";

const t = translations.simulator;
const tCommon = translations.common;

// Constantes de calcul
const HOURS_OPEN = 14; // heures d'ouverture par jour
const WASH_CYCLE_DURATION = 35; // minutes
const DRY_CYCLE_DURATION = 45; // minutes

// Taux d'occupation par scénario
const OCCUPANCY_RATES = {
  pessimiste: 0.15,
  central: 0.20,
  optimiste: 0.25,
};

interface QuickSimulation {
  surface: number;
  nbWashers: number;
  nbDryers: number;
  washerCapacity: number;
  dryerCapacity: number;
  avgPriceWash: number;
  avgPriceDry: number;
  hoursOpen: number;
}

interface ScenarioResult {
  name: string;
  rate: number;
  washCyclesPerDay: number;
  dryCyclesPerDay: number;
  turnoverPerDay: number;
  turnoverPerMonth: number;
}

function calculateQuickEstimation(sim: QuickSimulation) {
  // Capacité max par machine par jour
  const washCapacityPerMachinePerDay = (sim.hoursOpen * 60) / WASH_CYCLE_DURATION;
  const dryCapacityPerMachinePerDay = (sim.hoursOpen * 60) / DRY_CYCLE_DURATION;
  
  // Capacité totale par jour
  const totalWashCapacityPerDay = washCapacityPerMachinePerDay * sim.nbWashers;
  const totalDryCapacityPerDay = dryCapacityPerMachinePerDay * sim.nbDryers;

  // Calcul pour chaque scénario
  const scenarios: ScenarioResult[] = [
    { name: "Pessimiste", rate: OCCUPANCY_RATES.pessimiste, washCyclesPerDay: 0, dryCyclesPerDay: 0, turnoverPerDay: 0, turnoverPerMonth: 0 },
    { name: "Central", rate: OCCUPANCY_RATES.central, washCyclesPerDay: 0, dryCyclesPerDay: 0, turnoverPerDay: 0, turnoverPerMonth: 0 },
    { name: "Optimiste", rate: OCCUPANCY_RATES.optimiste, washCyclesPerDay: 0, dryCyclesPerDay: 0, turnoverPerDay: 0, turnoverPerMonth: 0 },
  ];

  for (const scenario of scenarios) {
    scenario.washCyclesPerDay = totalWashCapacityPerDay * scenario.rate;
    scenario.dryCyclesPerDay = totalDryCapacityPerDay * scenario.rate;
    
    const washTurnoverPerDay = scenario.washCyclesPerDay * sim.avgPriceWash;
    const dryTurnoverPerDay = scenario.dryCyclesPerDay * sim.avgPriceDry;
    
    scenario.turnoverPerDay = washTurnoverPerDay + dryTurnoverPerDay;
    scenario.turnoverPerMonth = scenario.turnoverPerDay * 30;
  }

  return {
    scenarios,
    maxWashCyclesPerDay: totalWashCapacityPerDay,
    maxDryCyclesPerDay: totalDryCapacityPerDay,
  };
}

export default function SimulateurPage() {
  const navigate = useNavigate();
  const [showResults, setShowResults] = useState(false);
  const [simulation, setSimulation] = useState<QuickSimulation>({
    surface: 50,
    nbWashers: 5,
    nbDryers: 4,
    washerCapacity: 10,
    dryerCapacity: 14,
    avgPriceWash: 5,
    avgPriceDry: 3,
    hoursOpen: HOURS_OPEN,
  });

  const results = calculateQuickEstimation(simulation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(true);
  };

  const handleUnlock = () => {
    navigate("/subscribe-simulator");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={lavcomLogo} alt="Lavcom Analytics" className="h-10 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t.nav.exploitantPricing}
            </Link>
            <Link to="/login?mode=exploitant">
              <Button variant="ghost">{t.nav.exploitantLogin}</Button>
            </Link>
            <Link to="/login?mode=simulateur">
              <Button variant="outline" className="border-amber-600/50 text-amber-700 dark:text-amber-400 hover:bg-amber-600/10">
                {t.nav.simulatorLogin}
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
            Gratuit
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground mb-3 md:mb-4 leading-tight">
            {t.title}
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg px-2">
            {t.subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {/* Formulaire */}
          <Card className="border-amber-500/30">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-xl">
                <Calculator className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
                {t.form.title}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {t.form.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="surface" className="text-xs md:text-sm">{t.form.surface}</Label>
                    <Input
                      id="surface"
                      type="number"
                      min={20}
                      max={500}
                      value={simulation.surface}
                      onChange={(e) => setSimulation({ ...simulation, surface: Number(e.target.value) })}
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="nbWashers" className="text-xs md:text-sm">{t.form.nbWashers}</Label>
                    <Input
                      id="nbWashers"
                      type="number"
                      min={1}
                      max={20}
                      value={simulation.nbWashers}
                      onChange={(e) => setSimulation({ ...simulation, nbWashers: Number(e.target.value) })}
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="washerCapacity">Capacité moyenne lave-linge</Label>
                    <Select
                      value={String(simulation.washerCapacity)}
                      onValueChange={(val) => setSimulation({ ...simulation, washerCapacity: Number(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Capacité" />
                      </SelectTrigger>
                      <SelectContent>
                        {WASHER_CAPACITIES.map((cap) => (
                          <SelectItem key={cap} value={String(cap)}>
                            {cap} kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avgPriceWash">{t.form.avgPriceWash}</Label>
                    <Input
                      id="avgPriceWash"
                      type="number"
                      min={1}
                      max={20}
                      step={0.5}
                      value={simulation.avgPriceWash}
                      onChange={(e) => setSimulation({ ...simulation, avgPriceWash: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nbDryers">{t.form.nbDryers}</Label>
                    <Input
                      id="nbDryers"
                      type="number"
                      min={1}
                      max={20}
                      value={simulation.nbDryers}
                      onChange={(e) => setSimulation({ ...simulation, nbDryers: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dryerCapacity">Capacité moyenne sèche-linge</Label>
                    <Select
                      value={String(simulation.dryerCapacity)}
                      onValueChange={(val) => setSimulation({ ...simulation, dryerCapacity: Number(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Capacité" />
                      </SelectTrigger>
                      <SelectContent>
                        {DRYER_CAPACITIES.map((cap) => (
                          <SelectItem key={cap} value={String(cap)}>
                            {cap} kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="avgPriceDry">{t.form.avgPriceDry}</Label>
                    <Input
                      id="avgPriceDry"
                      type="number"
                      min={1}
                      max={15}
                      step={0.5}
                      value={simulation.avgPriceDry}
                      onChange={(e) => setSimulation({ ...simulation, avgPriceDry: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hoursOpen">Heures d'ouverture / jour</Label>
                    <Input
                      id="hoursOpen"
                      type="number"
                      min={8}
                      max={24}
                      value={simulation.hoursOpen}
                      onChange={(e) => setSimulation({ ...simulation, hoursOpen: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  size="lg"
                >
                  <Calculator className="mr-2 h-5 w-5" />
                  {t.form.submit}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Résultats + Paywall */}
          <div className="space-y-6">
            {/* Résultats gratuits */}
            {showResults && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <TrendingUp className="h-5 w-5" />
                    {t.results.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Basé sur {simulation.hoursOpen}h d'ouverture, cycle lavage {WASH_CYCLE_DURATION} min, séchage {DRY_CYCLE_DURATION} min
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {results.scenarios.map((scenario, index) => {
                      const bgColor = index === 0 
                        ? "bg-red-500/10 border-red-500/30" 
                        : index === 1 
                          ? "bg-amber-500/10 border-amber-500/30" 
                          : "bg-green-500/10 border-green-500/30";
                      const textColor = index === 0 
                        ? "text-red-700 dark:text-red-400" 
                        : index === 1 
                          ? "text-amber-700 dark:text-amber-400" 
                          : "text-green-700 dark:text-green-400";
                      
                      return (
                        <div key={scenario.name} className={`p-4 rounded-lg border ${bgColor}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={`font-semibold ${textColor}`}>
                              {scenario.name} ({Math.round(scenario.rate * 100)}% occupation)
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">CA mensuel estimé</span>
                            <span className={`text-xl font-bold ${textColor}`}>
                              {Math.round(scenario.turnoverPerMonth).toLocaleString("fr-FR")} €/mois
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            ~{Math.round(scenario.washCyclesPerDay)} lavages + {Math.round(scenario.dryCyclesPerDay)} séchages / jour
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Capacité max : {Math.round(results.maxWashCyclesPerDay)} lavages + {Math.round(results.maxDryCyclesPerDay)} séchages / jour
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Paywall */}
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <CardTitle>{t.paywall.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {t.paywall.features.map((feature, index) => (
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
                  {t.paywall.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  {t.paywall.startingFrom} {SIMULATOR_PLANS.simulator.price} {translations.units.euroPerMonth}
                </p>
              </CardContent>
            </Card>

            {/* Note */}
            <Card className="bg-muted/30 border-muted">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>{t.note.title}</strong> {t.note.content}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
