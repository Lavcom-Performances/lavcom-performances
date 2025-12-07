import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, Building2, ArrowRight, Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  getLaundromatPricing, 
  LAUNDROMAT_PRICING 
} from "@/config/pricingConfig";
import lavcomLogo from "@/assets/lavcom-logo-header.png";

const features = [
  "Accès à toutes les analyses",
  "Tableau de bord complet",
  "Export PDF des rapports",
  "Module Recommandations Lavcom Analytics",
];

export default function Pricing() {
  const navigate = useNavigate();
  const [laundryCount, setLaundryCount] = useState(1);

  const pricing = getLaundromatPricing(laundryCount);

  const handleSelectPlan = (planId: string) => {
    navigate(`/subscribe?plan=${planId}&count=${laundryCount}`);
  };

  const incrementCount = () => setLaundryCount(prev => Math.min(prev + 1, 20));
  const decrementCount = () => setLaundryCount(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={lavcomLogo} alt="Lavcom Analytics" className="h-10 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </Link>
            <Link to="/simulateur" className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors">
              Simulation ouverture
            </Link>
            <Link to="/login?mode=exploitant">
              <Button variant="ghost">Se connecter</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        {/* Hero section */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <Badge variant="secondary" className="mb-4">
            Tarifs Exploitants – Prix dégressif selon le nombre de laveries
          </Badge>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Choisissez votre abonnement
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl">
            Plus vous avez de laveries, plus le prix par laverie diminue.
          </p>
        </div>

        {/* Laundry count selector */}
        <div className="max-w-md mx-auto mb-10">
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground mb-2">Nombre de laveries</p>
                <div className="flex items-center justify-center gap-4">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={decrementCount}
                    disabled={laundryCount <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-4xl font-bold text-foreground w-16 text-center">
                    {laundryCount}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={incrementCount}
                    disabled={laundryCount >= 20}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-muted-foreground">
                  {pricing.tierLabel}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing cards - Annual first on mobile */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Annual - Le plus populaire (first on mobile) */}
          <Card className="relative flex flex-col transition-all duration-300 hover:shadow-xl border-primary shadow-lg ring-2 ring-primary/20 order-first md:order-last">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground shadow-md gap-1">
                <Sparkles className="h-3 w-3" />
                Le plus populaire
              </Badge>
            </div>
            
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-display text-2xl">Annuel</CardTitle>
              <CardDescription className="text-base">2 mois offerts par rapport au mensuel</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 text-center">
              <div className="mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-foreground">{pricing.annualTotal}€</span>
                  <span className="text-muted-foreground">/an</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  soit {pricing.annualPricePerLav}€/an par laverie
                </p>
                <p className="text-sm text-primary font-semibold mt-2">
                  Économie de {pricing.annualSaving}€/an
                </p>
              </div>
              
              <ul className="space-y-3 text-left">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full h-12 text-base font-medium"
                onClick={() => handleSelectPlan("annual")}
              >
                Choisir l'abonnement annuel
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Monthly */}
          <Card className="relative flex flex-col transition-all duration-300 hover:shadow-xl border-border hover:border-primary/50 order-last md:order-first">
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-display text-2xl">Mensuel</CardTitle>
              <CardDescription className="text-base">Flexibilité maximale, sans engagement</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 text-center">
              <div className="mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-foreground">{pricing.monthlyTotal}€</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  soit {pricing.monthlyPricePerLav}€/mois par laverie
                </p>
              </div>
              
              <ul className="space-y-3 text-left">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full h-12 text-base font-medium"
                variant="outline"
                onClick={() => handleSelectPlan("monthly")}
              >
                Choisir l'abonnement mensuel
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Pricing explanation */}
        <div className="max-w-2xl mx-auto mt-16">
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Tarifs dégressifs en fonction du nombre de laveries</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-32 font-medium text-foreground">1 à 2 laveries</span>
                  <span>{LAUNDROMAT_PRICING.monthly.tier1.pricePerLaundromat} €/mois par laverie</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-32 font-medium text-foreground">3 à 5 laveries</span>
                  <span>{LAUNDROMAT_PRICING.monthly.tier2.pricePerLaundromat} €/mois par laverie</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-32 font-medium text-foreground">6 laveries et +</span>
                  <span>{LAUNDROMAT_PRICING.monthly.tier3.pricePerLaundromat} €/mois par laverie</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
                Le montant affiché s'adapte automatiquement lorsque vous modifiez le nombre de laveries.
                L'abonnement annuel vous offre 2 mois gratuits.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust badges */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-6">Paiement sécurisé par carte bancaire</p>
          <div className="flex items-center justify-center gap-8 opacity-60">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span className="text-sm">Facturation professionnelle</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span className="text-sm">Annulation à tout moment</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
