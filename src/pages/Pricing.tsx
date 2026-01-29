import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { Check, Building2, ArrowRight, Minus, Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  getLaundromatPricing, 
  LAUNDROMAT_PRICING 
} from "@/config/pricingConfig";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import { useTranslation } from "react-i18next";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";

export default function Pricing() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const [laundryCount, setLaundryCount] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const pricing = getLaundromatPricing(laundryCount);

  const handleStartTrial = () => {
    navigate('/signup');
  };

  const incrementCount = () => setLaundryCount(prev => Math.min(prev + 1, 100));
  const decrementCount = () => setLaundryCount(prev => Math.max(prev - 1, 1));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setLaundryCount(1);
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setLaundryCount(Math.max(1, Math.min(100, num)));
    }
  };

  const features = t('app:pricing.features', { returnObjects: true }) as string[];

  return (
    <>
      <SEOHead 
        title="Tarifs"
        description="Découvrez les tarifs de Lavcom Performances. Abonnements flexibles pour la gestion de vos laveries automatiques à partir de 29€/mois."
        url="/pricing"
        keywords="tarif laverie, prix logiciel laverie, abonnement gestion laverie, lavcom prix"
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={lavcomLogo} alt="Lavcom Analytics" className="h-10 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('app:nav.features')}
            </Link>
            <Link to="/simulateur" className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors">
              {t('app:nav.simulationOpening')}
            </Link>
            {isAuthenticated ? (
              <Button variant="ghost" asChild>
                <Link to="/dashboard">{t('common:accessApp')}</Link>
              </Button>
            ) : (
              <Button variant="ghost" asChild>
                <Link to="/login?mode=exploitant">{t('common:login')}</Link>
              </Button>
            )}
          </nav>
          
          {/* Mobile: Show login or access button */}
          <div className="md:hidden">
            {isAuthenticated ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">{t('common:accessApp')}</Link>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login?mode=exploitant">{t('common:login')}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 sm:py-12 lg:py-20">
        {/* Hero section */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 lg:mb-16">
          <Badge variant="secondary" className="mb-3 md:mb-4 text-xs md:text-sm">
            {t('app:pricing.badge')}
          </Badge>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground mb-3 md:mb-4 leading-tight">
            {t('app:pricing.title')}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-lg lg:text-xl px-2 mb-4">
            {t('app:pricing.subtitle')}
          </p>
          {/* Free trial highlight */}
          <Badge className="bg-primary/10 text-primary border-primary/30 px-4 py-2 text-sm md:text-base font-medium">
            ✨ {t('app:pricing.startTrial')} — {t('common:noCreditCard')}
          </Badge>
        </div>

        {/* Laundry count selector */}
        <div className="max-w-md mx-auto mb-8 md:mb-10">
          <Card className="border-primary/20">
            <CardContent className="pt-4 md:pt-6">
              <div className="text-center mb-3 md:mb-4">
                <p className="text-xs md:text-sm text-muted-foreground mb-2">{t('app:pricing.laundryCount')}</p>
                <div className="flex items-center justify-center gap-3 md:gap-4">
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-8 w-8 md:h-10 md:w-10"
                    onClick={decrementCount}
                    disabled={laundryCount <= 1}
                  >
                    <Minus className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={laundryCount}
                    onChange={handleInputChange}
                    className="w-20 md:w-24 text-center text-3xl md:text-4xl font-bold h-12 md:h-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-8 w-8 md:h-10 md:w-10"
                    onClick={incrementCount}
                    disabled={laundryCount >= 100}
                  >
                    <Plus className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-muted-foreground text-xs">
                  {pricing.tierLabel}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing cards - Annual first on mobile */}
        <div className="grid md:grid-cols-2 gap-4 lg:gap-8 max-w-4xl mx-auto">
          {/* Annual - Le plus populaire (first on mobile) */}
          <Card className="relative flex flex-col transition-all duration-300 hover:shadow-xl border-primary shadow-lg ring-2 ring-primary/20 order-first md:order-last">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground shadow-md gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                {t('app:pricing.plans.annual.badge')}
              </Badge>
            </div>
            
            <CardHeader className="text-center pb-2 pt-6">
              <CardTitle className="font-display text-xl md:text-2xl">{t('app:pricing.plans.annual.title')}</CardTitle>
              <CardDescription className="text-sm md:text-base">{t('app:pricing.plans.annual.description')}</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 text-center">
              <div className="mb-4 md:mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl md:text-5xl font-bold text-foreground">{pricing.annualTotal}€</span>
                  <span className="text-muted-foreground text-sm">{t('common:perYear')}</span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  soit {pricing.annualPricePerLav}€{t('common:perYear')} {t('app:pricing.plans.annual.perLaundry')}
                </p>
                <p className="text-xs md:text-sm text-primary font-semibold mt-2">
                  {t('app:pricing.plans.annual.saving')} {pricing.annualSaving}€{t('common:perYear')}
                </p>
              </div>
              
              <ul className="space-y-2 md:space-y-3 text-left">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 md:gap-3">
                    <Check className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground text-sm md:text-base">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full h-10 md:h-12 text-sm md:text-base font-medium"
                onClick={handleStartTrial}
              >
                {t('app:pricing.startTrial')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Monthly */}
          <Card className="relative flex flex-col transition-all duration-300 hover:shadow-xl border-border hover:border-primary/50 order-last md:order-first">
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-display text-xl md:text-2xl">{t('app:pricing.plans.monthly.title')}</CardTitle>
              <CardDescription className="text-sm md:text-base">{t('app:pricing.plans.monthly.description')}</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 text-center">
              <div className="mb-4 md:mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl md:text-5xl font-bold text-foreground">{pricing.monthlyTotal}€</span>
                  <span className="text-muted-foreground text-sm">{t('common:perMonth')}</span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  soit {pricing.monthlyPricePerLav}€{t('common:perMonth')} {t('app:pricing.plans.monthly.perLaundry')}
                </p>
              </div>
              
              <ul className="space-y-2 md:space-y-3 text-left">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 md:gap-3">
                    <Check className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground text-sm md:text-base">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                className="w-full h-10 md:h-12 text-sm md:text-base font-medium"
                variant="outline"
                onClick={handleStartTrial}
              >
                {t('app:pricing.startTrial')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Pricing explanation */}
        <div className="max-w-2xl mx-auto mt-10 md:mt-16">
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg font-semibold">{t('app:pricing.tiers.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="sm:w-32 font-medium text-foreground">{t('app:pricing.tiers.tier1')}</span>
                  <span>{LAUNDROMAT_PRICING.monthly.tier1.pricePerLaundromat} {t('app:pricing.tiers.perMonthPerLaundry')}</span>
                </li>
                <li className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="sm:w-32 font-medium text-foreground">{t('app:pricing.tiers.tier2')}</span>
                  <span>{LAUNDROMAT_PRICING.monthly.tier2.pricePerLaundromat} {t('app:pricing.tiers.perMonthPerLaundry')}</span>
                </li>
                <li className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="sm:w-32 font-medium text-foreground">{t('app:pricing.tiers.tier3')}</span>
                  <span>{LAUNDROMAT_PRICING.monthly.tier3.pricePerLaundromat} {t('app:pricing.tiers.perMonthPerLaundry')}</span>
                </li>
              </ul>
              <p className="text-xs md:text-sm text-muted-foreground mt-4 pt-4 border-t">
                {t('app:pricing.tiers.note')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trust badges */}
        <div className="mt-10 md:mt-16 text-center">
          <p className="text-muted-foreground text-sm mb-4 md:mb-6">{t('common:securePayment')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 opacity-60">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm">{t('common:professionalBilling')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm">{t('common:cancelAnytime')}</span>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
    </>
  );
}
