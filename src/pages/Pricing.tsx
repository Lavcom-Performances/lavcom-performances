import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, Building2, ArrowRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import lavcomLogo from "@/assets/lavcom-analytics-logo.png";

const pricingTiers = [
  { min: 1, max: 1, priceMonthly: 20, priceAnnual: 220, discount: 0 },
  { min: 2, max: 3, priceMonthly: 18, priceAnnual: 198, discount: 10 },
  { min: 4, max: 5, priceMonthly: 16, priceAnnual: 176, discount: 20 },
  { min: 6, max: Infinity, priceMonthly: 14, priceAnnual: 154, discount: 30 },
];

const getPricing = (count: number) => {
  const tier = pricingTiers.find(t => count >= t.min && count <= t.max) || pricingTiers[0];
  return {
    pricePerLaundryMonthly: tier.priceMonthly,
    pricePerLaundryAnnual: tier.priceAnnual,
    totalMonthly: tier.priceMonthly * count,
    totalAnnual: tier.priceAnnual * count,
    discount: tier.discount,
    savingsAnnual: (tier.priceMonthly * 12 - tier.priceAnnual) * count,
  };
};

export default function Pricing() {
  const navigate = useNavigate();
  const [laundryCount, setLaundryCount] = useState(1);

  const pricing = getPricing(laundryCount);

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
            Prix dégressif selon le nombre de laveries
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
              {pricing.discount > 0 && (
                <div className="text-center">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    -{pricing.discount}% de réduction appliquée
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Monthly */}
          <Card className="relative flex flex-col transition-all duration-300 hover:shadow-xl border-border hover:border-primary/50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-display text-2xl">Mensuel</CardTitle>
              <CardDescription className="text-base">Flexibilité maximale, sans engagement</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 text-center">
              <div className="mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-foreground">{pricing.totalMonthly}€</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  soit {pricing.pricePerLaundryMonthly}€/mois par laverie
                </p>
              </div>
              
              <ul className="space-y-3 text-left">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Accès à toutes les analyses</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Tableau de bord complet</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Export PDF des rapports</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Support par email</span>
                </li>
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full h-12 text-base font-medium"
                variant="outline"
                onClick={() => handleSelectPlan("monthly")}
              >
                Commencer maintenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Annual */}
          <Card className="relative flex flex-col transition-all duration-300 hover:shadow-xl border-primary shadow-lg ring-2 ring-primary/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground shadow-md">
                Le plus populaire
              </Badge>
            </div>
            
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-display text-2xl">Annuel</CardTitle>
              <CardDescription className="text-base">Économisez {pricing.savingsAnnual}€ par an</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 text-center">
              <div className="mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-foreground">{pricing.totalAnnual}€</span>
                  <span className="text-muted-foreground">/an</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  soit {pricing.pricePerLaundryAnnual}€/an par laverie
                </p>
                <p className="text-sm text-primary font-medium mt-1">
                  Économie de {pricing.savingsAnnual}€/an
                </p>
              </div>
              
              <ul className="space-y-3 text-left">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Accès à toutes les analyses</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Tableau de bord complet</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Export PDF des rapports</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Support prioritaire</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground">Accès anticipé aux nouveautés</span>
                </li>
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full h-12 text-base font-medium"
                onClick={() => handleSelectPlan("annual")}
              >
                Commencer maintenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Pricing table */}
        <div className="max-w-2xl mx-auto mt-16">
          <h3 className="font-display text-xl font-semibold text-center mb-6">Grille tarifaire dégressive</h3>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nb de laveries</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Prix/laverie/mois</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Prix/laverie/an</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Réduction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pricingTiers.map((tier, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-foreground">
                      {tier.max === Infinity ? `${tier.min}+` : tier.min === tier.max ? tier.min : `${tier.min}-${tier.max}`}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{tier.priceMonthly}€</td>
                    <td className="px-4 py-3 text-center font-medium">{tier.priceAnnual}€</td>
                    <td className="px-4 py-3 text-right">
                      {tier.discount > 0 ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">-{tier.discount}%</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
