import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import lavcomLogo from "@/assets/lavcom-analytics-logo.png";

const plans = [
  {
    id: "monthly",
    name: "Mensuel",
    price: 20,
    period: "mois",
    description: "Flexibilité maximale, sans engagement",
    features: [
      "Accès à toutes les analyses",
      "Tableau de bord complet",
      "Export PDF des rapports",
      "Support par email",
      "Mises à jour incluses",
    ],
  },
  {
    id: "annual",
    name: "Annuel",
    price: 220,
    period: "an",
    originalPrice: 240,
    savings: 20,
    description: "Économisez 20€ par an",
    popular: true,
    features: [
      "Accès à toutes les analyses",
      "Tableau de bord complet",
      "Export PDF des rapports",
      "Support prioritaire",
      "Mises à jour incluses",
      "Accès anticipé aux nouvelles fonctionnalités",
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    navigate(`/subscribe?plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={lavcomLogo} alt="Lavcom Analytics" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Se connecter</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        {/* Hero section */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <Badge variant="secondary" className="mb-4">
            Tarification simple et transparente
          </Badge>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Choisissez votre abonnement
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl">
            Accédez à toutes les fonctionnalités d'analyse pour optimiser la performance de vos laveries.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative flex flex-col transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? "border-primary shadow-lg ring-2 ring-primary/20" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-md">
                    Le plus populaire
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="font-display text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 text-center">
                <div className="mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-foreground">{plan.price}€</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  {plan.originalPrice && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="line-through">{plan.originalPrice}€</span>
                      <span className="text-primary font-medium ml-2">
                        Économisez {plan.savings}€
                      </span>
                    </p>
                  )}
                </div>
                
                <ul className="space-y-3 text-left">
                  {plan.features.map((feature, index) => (
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
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  Commencer maintenant
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
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
