import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  CheckCircle2, 
  Lock, 
  FileText, 
  TrendingUp, 
  Target,
  Coins,
  BarChart3,
  ArrowRight
} from "lucide-react";
import lavcomLogo from "@/assets/lavcom-logo-header.png";

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
    // TODO: Check if user is logged in and has access
    // For now, redirect to subscribe-simulator
    navigate("/subscribe-simulator");
  };

  const trafficLabels: Record<TrafficLevel, string> = {
    low: "Prudent (3 cycles/jour)",
    medium: "Réaliste (5 cycles/jour)",
    high: "Ambitieux (7 cycles/jour)",
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
              Tarifs Exploitants
            </Link>
            <Link to="/login?mode=exploitant">
              <Button variant="ghost">Connexion Exploitant</Button>
            </Link>
            <Link to="/login?mode=simulateur">
              <Button variant="outline" className="border-amber-600/50 text-amber-700 dark:text-amber-400 hover:bg-amber-600/10">
                Connexion Simulateur
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
            Estimation gratuite
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Simulateur de laverie
          </h1>
          <p className="text-muted-foreground text-lg">
            Répondez à quelques questions et obtenez un ordre de grandeur de votre futur chiffre d'affaires.
            L'analyse complète (seuil de rentabilité, charges, cycles/jour, rapport PDF) est réservée aux abonnés.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Formulaire */}
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-600" />
                Estimation rapide
              </CardTitle>
              <CardDescription>
                Remplissez ces informations pour obtenir une première estimation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="surface">Surface du local (m²)</Label>
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
                    <Label htmlFor="nbWashers">Nombre de lave-linge</Label>
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
                    <Label htmlFor="nbDryers">Nombre de sèche-linge</Label>
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
                    <Label htmlFor="avgPriceWash">Prix moyen lavage (€)</Label>
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
                    <Label htmlFor="avgPriceDry">Prix moyen séchage (€)</Label>
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
                  <Label>Niveau de fréquentation attendu</Label>
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
                  Calculer mon estimation
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
                    Votre estimation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">CA lavage estimé</span>
                      <span className="text-xl font-bold text-foreground">
                        {results.washTurnoverMonth.toLocaleString("fr-FR")} €/mois
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                      <span className="text-muted-foreground">CA séchage estimé</span>
                      <span className="text-xl font-bold text-foreground">
                        {results.dryTurnoverMonth.toLocaleString("fr-FR")} €/mois
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <span className="font-medium text-foreground">CA total estimé</span>
                      <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                        {results.totalTurnoverMonth.toLocaleString("fr-FR")} €/mois
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Estimation basée sur {results.cyclesPerMachinePerDay} cycles/machine/jour
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Paywall */}
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <CardTitle>Analyse détaillée réservée aux abonnés</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Calcul de votre seuil de rentabilité (CA/mois)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Nombre de cycles/jour nécessaires pour couvrir vos charges</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Intégration de vos charges fixes et variables</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Analyse de la rentabilité estimée de votre projet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Sauvegarde de plusieurs scénarios de laverie</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Rapport PDF prêt pour votre banque</span>
                  </li>
                </ul>

                <Button 
                  onClick={handleUnlock}
                  className="w-full"
                  size="lg"
                >
                  Débloquer l'analyse complète
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  À partir de 79 €/mois
                </p>
              </CardContent>
            </Card>

            {/* Note */}
            <Card className="bg-muted/30 border-muted">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Note :</strong> Cette estimation est basée sur des hypothèses moyennes. 
                  Elle ne remplace pas une étude complète de zone, de local et de charges.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
