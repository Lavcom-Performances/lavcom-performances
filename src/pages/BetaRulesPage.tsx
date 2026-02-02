import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Sparkles, Calendar, Euro, Download, MessageSquare, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useBetaOnboarding } from "@/hooks/useBetaOnboarding";
import { useBetaEvents } from "@/hooks/useBetaEvents";
import { BetaChecklist } from "@/components/beta/BetaChecklist";
import { BetaFeedbackButton } from "@/components/feedback/BetaFeedbackButton";
import { useEffect } from "react";

export default function BetaRulesPage() {
  const { betaEndsAt, isBeta, isLoading } = useBetaOnboarding();
  const { logBetaEvent } = useBetaEvents();

  useEffect(() => {
    if (isBeta) {
      logBetaEvent("beta_rules_page_viewed");
    }
  }, [isBeta, logBetaEvent]);

  const formattedEndDate = betaEndsAt
    ? format(new Date(betaEndsAt), "d MMMM yyyy", { locale: fr })
    : "date à confirmer";

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!isBeta) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Cette page est réservée aux utilisateurs du programme bêta.
            </p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">Retour au tableau de bord</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Programme Bêta Lavcom</h1>
            <p className="text-muted-foreground">Informations et règles du programme</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Timeline Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Durée du programme</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Votre participation au programme bêta se termine le :
            </p>
            <p className="text-2xl font-bold text-foreground">{formattedEndDate}</p>
            <p className="text-xs text-muted-foreground">
              À cette date, votre compte passera automatiquement au tarif standard.
            </p>
          </CardContent>
        </Card>

        {/* Pricing Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Tarification</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">9€</span>
              <span className="text-muted-foreground">/ laverie / mois</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tarif bêta préférentiel. Après la fin du programme, le tarif standard de 29€/mois s'appliquera.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Section */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist de démarrage</CardTitle>
          <CardDescription>Suivez ces étapes pour tirer le meilleur parti de Lavcom</CardDescription>
        </CardHeader>
        <CardContent>
          <BetaChecklist variant="inline" />
        </CardContent>
      </Card>

      {/* Selling a Laundromat Section */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">En cas de vente d'une laverie</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Si vous vendez une laverie, le nouvel acquéreur <strong className="text-foreground">n'hérite pas automatiquement</strong> de vos données.
          </p>
          <p className="text-sm text-muted-foreground">
            Si vous souhaitez transmettre l'historique, exportez vos données et fournissez-les manuellement au nouveau propriétaire.
          </p>
          
          <Separator />
          
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild className="gap-2">
              <Link to="/exports">
                <Download className="h-4 w-4" />
                Exporter mes données
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to="/laundromat-settings">
                Fermer / Réactiver une laverie
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Vos retours comptent</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            En tant que participant bêta, vos retours nous aident à améliorer Lavcom. N'hésitez pas à nous faire part de vos suggestions, bugs ou confusions.
          </p>
          <BetaFeedbackButton variant="default" />
        </CardContent>
      </Card>
    </div>
  );
}
