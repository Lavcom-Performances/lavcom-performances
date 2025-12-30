import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  CreditCard, 
  Calendar, 
  Building2, 
  Settings, 
  ExternalLink, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  FileText
} from "lucide-react";
import { format, Locale } from "date-fns";
import { fr, enUS, de, es, it, nl } from "date-fns/locale";
import { SEOHead } from "@/components/seo/SEOHead";

const localeMap: Record<string, Locale> = { fr, en: enUS, de, es, it, nl };

export default function SubscriptionManagement() {
  const { t, i18n } = useTranslation(["app", "common"]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, loading, isSubscriptionActive, isTrialActive, daysRemaining, planType, lastInvoiceUrl } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const locale = localeMap[i18n.language] || fr;

  const handleOpenPortal = async () => {
    if (!user) {
      toast.error(t("common:errors.notAuthenticated"));
      navigate("/login");
      return;
    }

    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(message);
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!subscription) return null;
    
    const status = subscription.status;
    if (status === "active" && !isTrialActive) {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Actif</Badge>;
    }
    if (isTrialActive) {
      if (daysRemaining <= 3) {
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Essai - {daysRemaining}j restants</Badge>;
      }
      return <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30">Essai gratuit</Badge>;
    }
    if (status === "past_due") {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Paiement en retard</Badge>;
    }
    if (status === "canceled") {
      return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Annulé</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const getPlanLabel = () => {
    if (isTrialActive) return "Essai gratuit (14 jours)";
    if (planType === "annual") return "Abonnement annuel";
    if (planType === "monthly") return "Abonnement mensuel";
    return "Aucun abonnement";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Gestion de l'abonnement | Lavcom Performances"
        description="Gérez votre abonnement Lavcom Performances"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Gestion de l'abonnement</h1>
              <p className="text-sm text-muted-foreground">Gérez votre forfait et vos paiements</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="grid gap-6">
            {/* Current Plan Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Votre forfait actuel</CardTitle>
                      <CardDescription>{getPlanLabel()}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Laundry Count */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Laveries</p>
                      <p className="font-medium">{subscription?.laundry_count || 1} laverie(s)</p>
                    </div>
                  </div>

                  {/* Next Billing / Trial End */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {isTrialActive ? "Fin de l'essai" : "Prochaine facturation"}
                      </p>
                      <p className="font-medium">
                        {isTrialActive && subscription?.trial_end_date
                          ? format(new Date(subscription.trial_end_date), "d MMMM yyyy", { locale })
                          : subscription?.subscription_end_date
                          ? format(new Date(subscription.subscription_end_date), "d MMMM yyyy", { locale })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trial Warning */}
                {isTrialActive && daysRemaining <= 7 && (
                  <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-500">
                        Votre essai se termine dans {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Souscrivez maintenant pour continuer à utiliser toutes les fonctionnalités.
                      </p>
                      <Button 
                        className="mt-3" 
                        size="sm"
                        onClick={() => navigate("/subscribe")}
                      >
                        Choisir un forfait
                      </Button>
                    </div>
                  </div>
                )}

                {/* Past Due Warning */}
                {subscription?.status === "past_due" && (
                  <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-500">Paiement en retard</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Votre dernier paiement a échoué. Mettez à jour vos informations de paiement pour continuer.
                      </p>
                      <Button 
                        className="mt-3" 
                        size="sm"
                        variant="destructive"
                        onClick={handleOpenPortal}
                        disabled={portalLoading}
                      >
                        {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Mettre à jour le paiement
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Manage Subscription */}
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleOpenPortal}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Gérer l'abonnement</h3>
                        <p className="text-sm text-muted-foreground">
                          Modifier, suspendre ou annuler
                        </p>
                      </div>
                    </div>
                    {portalLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleOpenPortal}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/10 rounded-lg">
                        <CreditCard className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Moyens de paiement</h3>
                        <p className="text-sm text-muted-foreground">
                          Ajouter ou modifier une carte
                        </p>
                      </div>
                    </div>
                    {portalLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Section */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Last Invoice */}
              {lastInvoiceUrl && !isTrialActive && (
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-lg">
                          <FileText className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Dernière facture TTC</h3>
                          <p className="text-sm text-muted-foreground">
                            Consultez et téléchargez
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(lastInvoiceUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Voir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Billing History Link */}
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors" 
                onClick={() => navigate("/billing-history")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Historique des factures</h3>
                        <p className="text-sm text-muted-foreground">
                          Toutes vos factures TTC
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Features included */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fonctionnalités incluses</CardTitle>
                <CardDescription>Tout ce qui est inclus dans votre forfait</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    "Tableau de bord en temps réel",
                    "Import CSV illimité",
                    "Analyses de rentabilité",
                    "Comparaison multi-sites",
                    "Export PDF des rapports",
                    "Recommandations personnalisées",
                    "Historique complet",
                    "Support prioritaire",
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upgrade CTA for trial users */}
            {isTrialActive && (
              <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/20 rounded-full">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Passez à un forfait payant</h3>
                        <p className="text-sm text-muted-foreground">
                          Débloquez toutes les fonctionnalités sans limite de temps
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => navigate("/subscribe")}>
                      Voir les forfaits
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
