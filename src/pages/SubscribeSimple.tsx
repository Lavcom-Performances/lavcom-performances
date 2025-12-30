import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, CreditCard, Loader2, Minus, Plus, Sparkles, Zap, Shield, BarChart3, Crown, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getLaundromatPricing } from "@/config/pricingConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import lavcomLogo from "@/assets/lavcom-performances-header.png";

// Price IDs must match the backend allowlist
const PRICE_IDS = {
  tier1: { monthly: "price_1ShGd1B849ikvSjDddCJJA4c", annual: "price_1ShGinB849ikvSjDbjYUTkdw" },
  tier2: { monthly: "price_1ShGeVB849ikvSjD3LIR8UtE", annual: "price_1ShGjEB849ikvSjD4VnQGXQO" },
  tier3: { monthly: "price_1ShGetB849ikvSjDs2aIkeYS", annual: "price_1ShGjaB849ikvSjDIWARPdI2" },
};

function getTier(count: number): "tier1" | "tier2" | "tier3" {
  if (count <= 2) return "tier1";
  if (count <= 5) return "tier2";
  return "tier3";
}

export default function SubscribeSimple() {
  const { t } = useTranslation(['app', 'common']);
  const { user, isAuthenticated } = useAuth();
  const { subscription, loading: subscriptionLoading, isSubscriptionActive, planType } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const planFromUrl = searchParams.get("plan") || "annual";
  const countFromUrl = parseInt(searchParams.get("count") || "1", 10);
  
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(
    planFromUrl === "monthly" ? "monthly" : "annual"
  );
  const [laundryCount, setLaundryCount] = useState(countFromUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // Check if user already has an active paid subscription
  const isPaidSubscriber = isSubscriptionActive && planType !== "trial";

  const tier = getTier(laundryCount);
  const priceId = PRICE_IDS[tier][selectedPlan];

  const pricing = getLaundromatPricing(laundryCount);
  
  const monthlyTotal = pricing.monthlyTotal;
  const annualTotal = pricing.annualTotal;
  const annualMonthlyEquivalent = Math.round(annualTotal / 12);
  const savingsPercent = Math.round((1 - annualTotal / (monthlyTotal * 12)) * 100);

  const incrementCount = () => setLaundryCount(prev => Math.min(prev + 1, 50));
  const decrementCount = () => setLaundryCount(prev => Math.max(prev - 1, 1));

  const handleCheckout = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: t('app:subscribe.loginRequired'),
        description: t('app:subscribe.loginRequiredDesc'),
        variant: "destructive",
      });
      navigate("/login?redirect=/subscribe");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          price_id: priceId,
          plan: selectedPlan,
          laundryCount: laundryCount,
          success_url: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/subscribe`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: t('app:subscribe.checkoutError'),
        description: t('app:subscribe.checkoutErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setIsPortalLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      console.error("Portal error:", err);
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'ouvrir le portail de gestion.",
        variant: "destructive",
      });
    } finally {
      setIsPortalLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, text: t('app:subscribe.features.dashboard') },
    { icon: Zap, text: t('app:subscribe.features.analytics') },
    { icon: Shield, text: t('app:subscribe.features.security') },
    { icon: Sparkles, text: t('app:subscribe.features.recommendations') },
  ];

  // Show loading while checking subscription
  if (subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Already subscribed - show management options
  if (isPaidSubscriber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={lavcomLogo} alt="Lavcom Performances" className="h-10 w-auto" />
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au tableau de bord
              </Button>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto">
            <Card className="border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <CardTitle>Vous êtes déjà abonné</CardTitle>
                </div>
                <CardDescription>
                  {subscription?.laundry_count || 1} laverie(s) • {planType === "annual" ? "Annuel" : "Mensuel"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pour changer de pack, modifier votre mode de paiement ou annuler votre abonnement, 
                  utilisez le portail client Stripe.
                </p>
                <div className="flex flex-col gap-3">
                  <Button onClick={handleOpenPortal} disabled={isPortalLoading}>
                    {isPortalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                    Changer de pack
                  </Button>
                  <Button variant="outline" onClick={handleOpenPortal} disabled={isPortalLoading}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Gérer la facturation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={lavcomLogo} alt="Lavcom Performances" className="h-10 w-auto" />
          </Link>
          <Link to="/pricing">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('app:subscribe.backToPricing')}
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
              {t('app:subscribeSimple.title')}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t('app:subscribeSimple.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Plan selection */}
            <div className="space-y-6">
              {/* Laundry count */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('app:subscribeSimple.laundryCount')}</CardTitle>
                  <CardDescription>{t('app:subscribeSimple.laundryCountDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-4">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={decrementCount}
                      disabled={laundryCount <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={laundryCount}
                      onChange={(e) => setLaundryCount(Math.min(Math.max(parseInt(e.target.value) || 1, 1), 50))}
                      className="w-20 text-center text-2xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={incrementCount}
                      disabled={laundryCount >= 50}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    {pricing.tierLabel} — {pricing.monthlyPricePerLav}€/{t('common:perMonth')}/{t('common:laundry')}
                  </p>
                </CardContent>
              </Card>

              {/* Plan selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">{t('app:subscribeSimple.choosePlan')}</Label>
                
                {/* Annual plan */}
                <button
                  onClick={() => setSelectedPlan("annual")}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPlan === "annual"
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{t('app:subscribeSimple.annual')}</span>
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          -{savingsPercent}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('app:subscribeSimple.annualDesc')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{annualTotal}€</div>
                      <div className="text-sm text-muted-foreground">
                        ~{annualMonthlyEquivalent}€/{t('common:perMonth')}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Monthly plan */}
                <button
                  onClick={() => setSelectedPlan("monthly")}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPlan === "monthly"
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-semibold text-lg">{t('app:subscribeSimple.monthly')}</span>
                      <p className="text-sm text-muted-foreground">
                        {t('app:subscribeSimple.monthlyDesc')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{monthlyTotal}€</div>
                      <div className="text-sm text-muted-foreground">/{t('common:perMonth')}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Right: Summary & checkout */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {t('app:subscribeSimple.summary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Features */}
                  <div className="space-y-3">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <feature.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {laundryCount} {laundryCount > 1 ? t('common:laundries') : t('common:laundry')}
                      </span>
                      <span>{pricing.monthlyPricePerLav}€ × {laundryCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('app:subscribeSimple.billing')}</span>
                      <span>{selectedPlan === "annual" ? t('app:subscribeSimple.annual') : t('app:subscribeSimple.monthly')}</span>
                    </div>
                    {selectedPlan === "annual" && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{t('app:subscribeSimple.savings')}</span>
                        <span>-{pricing.annualSaving}€</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>{t('app:subscribeSimple.total')}</span>
                      <span>
                        {selectedPlan === "annual" ? annualTotal : monthlyTotal}€
                        <span className="text-sm font-normal text-muted-foreground">
                          /{selectedPlan === "annual" ? t('common:perYear') : t('common:perMonth')}
                        </span>
                      </span>
                    </div>
                  </div>

                  <Button 
                    className="w-full h-12 text-lg font-semibold" 
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isLoading || !isAuthenticated}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t('app:subscribeSimple.processing')}
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        {t('app:subscribeSimple.subscribe')}
                      </>
                    )}
                  </Button>

                  {!isAuthenticated && (
                    <p className="text-center text-sm text-muted-foreground">
                      <Link to="/login" className="text-primary hover:underline">
                        {t('app:subscribeSimple.loginFirst')}
                      </Link>
                    </p>
                  )}

                  <p className="text-center text-xs text-muted-foreground">
                    {t('app:subscribeSimple.securePayment')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
