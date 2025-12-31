import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2
} from "lucide-react";
import { format, Locale } from "date-fns";
import { fr, enUS, de, es, it, nl } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { PaymentStatusIndicators } from "./PaymentStatusIndicators";

const localeMap: Record<string, Locale> = { fr, en: enUS, de, es, it, nl };

export default function SubscriptionContent() {
  const { t, i18n } = useTranslation(["app", "common"]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, loading, isTrialActive, daysRemaining, planType, lastInvoiceUrl } = useSubscription();
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
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Payment Status Indicators */}
      <PaymentStatusIndicators />

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
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Laveries</p>
                <p className="font-medium">{subscription?.laundry_count || 1} laverie(s)</p>
              </div>
            </div>

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
                <Button className="mt-3" size="sm" onClick={() => navigate("/subscribe")}>
                  Choisir un forfait
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleOpenPortal}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Gérer l'abonnement</h3>
                  <p className="text-sm text-muted-foreground">Modifier, suspendre ou annuler</p>
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

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleOpenPortal}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <CreditCard className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Moyens de paiement</h3>
                  <p className="text-sm text-muted-foreground">Ajouter ou modifier une carte</p>
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
              <Button onClick={() => navigate("/subscribe")}>Voir les forfaits</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
