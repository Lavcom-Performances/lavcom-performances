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
import lavcomLogo from "@/assets/lavcom-logo-header.png";
import { translations } from "@/lib/i18n";
import { SIMULATOR_PLANS } from "@/config/pricingConfig";

const t = translations.simulator;
const tCommon = translations.common;

type TrafficLevel = "low" | "medium" | "high";

interface QuickSimulation {
  surface: number;
  nbWashers: number;
  nbDryers: number;
  avgPriceWash: number;
  avgPriceDry: number;
  trafficLevel: TrafficLevel;
}

function getCyclesPerMachinePerDay(level: TrafficLevel): number {
  if (level === "low") return 3;
  if (level === "medium") return 5;
  return 7;
}

function calculateQuickEstimation(sim: QuickSimulation) {
  const cyclesPerMachinePerDay = getCyclesPerMachinePerDay(sim.trafficLevel);
  const washTurnoverMonth = sim.nbWashers * cyclesPerMachinePerDay * sim.avgPriceWash * 30;
  const dryTurnoverMonth = sim.nbDryers * cyclesPerMachinePerDay * sim.avgPriceDry * 30;
  const totalTurnoverMonth = washTurnoverMonth + dryTurnoverMonth;

  return {
    washTurnoverMonth,
    dryTurnoverMonth,
    totalTurnoverMonth,
    cyclesPerMachinePerDay,
  };
}

export default function SimulateurPage() {
  const navigate = useNavigate();
  const [showResults, setShowResults] = useState(false);
  const [simulation, setSimulation] = useState<QuickSimulation>({
    surface: 50,
    nbWashers: 5,
    nbDryers: 4,
    avgPriceWash: 5,
    avgPriceDry: 3,
    trafficLevel: "medium",
  });

  const results = calculateQuickEstimation(simulation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(true);
  };

  const handleUnlock = () => {
    navigate("/subscribe-simulator");
  };

  const trafficLabels: Record<TrafficLevel, string> = {
    low: t.form.trafficLevels.low,
    medium: t.form.trafficLevels.medium,
    high: t.form.trafficLevels.high,
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

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Calculator className="h-4 w-4" />
            {t.badge}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {t.title}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t.subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Formulaire */}
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-600" />
                {t.form.title}
              </CardTitle>
              <CardDescription>
                {t.form.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="surface">{t.form.surface}</Label>
                    <Input
                      id="surface"
                      type="number"
                      min={20}
                      max={500}
                      value={simulation.surface}
                      onChange={(e) => setSimulation({ ...simulation, surface: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nbWashers">{t.form.nbWashers}</Label>
                    <Input
                      id="nbWashers"
                      type="number"
                      min={1}
                      max={20}
                      value={simulation.nbWashers}
                      onChange={(e) => setSimulation({ ...simulation, nbWashers: Number(e.target.value) })}
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
                </div>

                <div className="space-y-3">
                  <Label>{t.form.trafficLevel}</Label>
                  <RadioGroup
                    value={simulation.trafficLevel}
                    onValueChange={(val) => setSimulation({ ...simulation, trafficLevel: val as TrafficLevel })}
                    className="grid gap-2"
                  >
                    {(["low", "medium", "high"] as TrafficLevel[]).map((level) => (
                      <label
                        key={level}
                        htmlFor={level}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          simulation.trafficLevel === level 
                            ? "border-amber-600 bg-amber-500/10" 
                            : "border-border hover:border-amber-600/50"
                        }`}
                      >
                        <RadioGroupItem value={level} id={level} />
                        <span className="text-sm">{trafficLabels[level]}</span>
                      </label>
                    ))}
                  </RadioGroup>
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
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">{t.results.washRevenue}</span>
                      <span className="text-xl font-bold text-foreground">
                        {results.washTurnoverMonth.toLocaleString("fr-FR")} {translations.units.euroPerMonth}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">{t.results.dryRevenue}</span>
                      <span className="text-xl font-bold text-foreground">
                        {results.dryTurnoverMonth.toLocaleString("fr-FR")} {translations.units.euroPerMonth}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <span className="font-medium text-foreground">{t.results.totalRevenue}</span>
                      <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                        {results.totalTurnoverMonth.toLocaleString("fr-FR")} {translations.units.euroPerMonth}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    {t.results.basedOn.replace("{cycles}", String(results.cyclesPerMachinePerDay))}
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
