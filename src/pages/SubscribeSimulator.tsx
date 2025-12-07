import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Video, 
  Check, 
  Sparkles, 
  ArrowLeft,
  FileText,
  Target,
  Layers,
  Clock
} from "lucide-react";
import { SIMULATOR_PLANS } from "@/config/pricingConfig";
import lavcomLogo from "@/assets/lavcom-logo-header.png";

export default function SubscribeSimulator() {
  const navigate = useNavigate();

  const handleSubscribe = (planId: string) => {
    // TODO: Integrate with payment system (Stripe)
    console.log("Subscribe to plan:", planId);
    // For now, simulate successful subscription
    // In production: redirect to Stripe checkout, then on success set user.hasSimulatorAccess = true
    navigate("/simulation");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={lavcomLogo} alt="Lavcom Analytics" className="h-10 w-auto" />
          </Link>
          <Link to="/simulateur">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au simulateur
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
            Lavcom Analytics Création
          </Badge>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Choisissez votre formule
          </h1>
          <p className="text-muted-foreground text-lg">
            Accédez au simulateur complet et préparez votre projet de laverie avec tous les outils dont vous avez besoin.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Pack Simulateur */}
          <Card className="relative flex flex-col transition-all duration-300 hover:shadow-xl border-border hover:border-amber-600/50">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle className="font-display text-2xl">{SIMULATOR_PLANS.simulator.name}</CardTitle>
              <CardDescription className="text-base">
                Accès complet à l'espace Futur exploitant
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-foreground">{SIMULATOR_PLANS.simulator.price} €</span>
                  <span className="text-muted-foreground">TTC/{SIMULATOR_PLANS.simulator.billing}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Sans engagement</p>
              </div>
              
              <ul className="space-y-3 flex-1">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-foreground">Simulateur détaillé : local, machines, charges</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-foreground">Calcul du seuil de rentabilité</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-foreground">Scénarios illimités</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-foreground">Rapport PDF pour votre banque</span>
                </li>
              </ul>

              <Button 
                className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white h-12 text-base"
                onClick={() => handleSubscribe("simulator")}
              >
                Choisir le Pack Simulateur
              </Button>
            </CardContent>
          </Card>

          {/* Pack Premium */}
          <Card className="relative flex flex-col transition-all duration-300 hover:shadow-xl border-primary shadow-lg ring-2 ring-primary/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground shadow-md gap-1">
                <Sparkles className="h-3 w-3" />
                Recommandé
              </Badge>
            </div>
            
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">{SIMULATOR_PLANS.premium.name}</CardTitle>
              <CardDescription className="text-base">
                Simulateur + accompagnement personnalisé
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-foreground">{SIMULATOR_PLANS.premium.price} €</span>
                  <span className="text-muted-foreground">TTC</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Paiement unique</p>
              </div>
              
              <ul className="space-y-3 flex-1">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">1 mois d'accès simulateur complet</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">1h de visio avec un expert</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Analyse personnalisée de votre projet</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Conseils sur le choix du local</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Recommandations équipements</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Compte-rendu écrit post-visio</span>
                </li>
              </ul>

              <Button 
                className="w-full mt-6 h-12 text-base"
                onClick={() => handleSubscribe("premium")}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Choisir le Pack Premium
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features comparison */}
        <div className="max-w-3xl mx-auto mt-16">
          <Card className="bg-muted/30">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Ce que vous obtenez</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <Target className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium">Seuil de rentabilité</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <Layers className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium">Scénarios multiples</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <FileText className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium">Rapports PDF</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium">Accès illimité</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Already subscribed */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Vous avez déjà un abonnement ?{" "}
            <Link to="/login?mode=simulateur" className="text-primary hover:underline">
              Connectez-vous
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
