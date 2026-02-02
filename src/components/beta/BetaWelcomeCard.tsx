import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { X, Sparkles, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBetaOnboarding } from "@/hooks/useBetaOnboarding";
import { BetaChecklist } from "./BetaChecklist";

export function BetaWelcomeCard() {
  const {
    shouldShowWelcome,
    betaEndsAt,
    dismissWelcome,
    openChecklist,
  } = useBetaOnboarding();

  const [showChecklist, setShowChecklist] = useState(false);

  if (!shouldShowWelcome) return null;

  const formattedEndDate = betaEndsAt
    ? format(new Date(betaEndsAt), "d MMMM yyyy", { locale: fr })
    : "date à confirmer";

  const handleStartChecklist = () => {
    openChecklist();
    setShowChecklist(true);
    dismissWelcome(false);
  };

  const handleSkip = () => {
    dismissWelcome(true);
  };

  if (showChecklist) {
    return <BetaChecklist onClose={() => setShowChecklist(false)} />;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg mb-6 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={handleSkip}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Bienvenue dans la bêta Lavcom</CardTitle>
            <CardDescription>Programme bêta payant</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Vous utilisez Lavcom avec des données réelles en conditions réelles.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              Tarif bêta : <strong className="text-foreground">9€ / laverie / mois</strong> jusqu'au{" "}
              <strong className="text-foreground">{formattedEndDate}</strong>, puis tarification standard automatique.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              Certaines fonctionnalités peuvent évoluer pendant la bêta — vos retours nous aident à nous améliorer.
            </span>
          </li>
        </ul>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleStartChecklist} className="gap-2">
            <ListChecks className="h-4 w-4" />
            Démarrer la checklist
          </Button>
          <Button variant="ghost" onClick={handleSkip}>
            Passer pour l'instant
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
