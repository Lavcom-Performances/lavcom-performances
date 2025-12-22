import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";

const PACK_NAMES: Record<string, string> = {
  essential: "Essentiel",
  project: "Projet",
  comparator: "Comparateur",
  premium: "Premium",
};

const PACK_FEATURES: Record<string, string[]> = {
  essential: ["1 projet de simulation", "Accès 30 jours", "Export PDF"],
  project: ["3 projets de simulation", "Accès 90 jours", "Export PDF", "Comparaison scénarios"],
  comparator: ["5 projets de simulation", "Accès 180 jours", "Export PDF", "Comparaison scénarios", "Support prioritaire"],
  premium: ["Projets illimités", "Accès 90 jours", "Export PDF", "Comparaison scénarios", "Support prioritaire", "Accès anticipé nouvelles fonctionnalités"],
};

export default function SimulatorPaymentSuccess() {
  const { t } = useTranslation(['app']);
  const [searchParams] = useSearchParams();
  const [packId, setPackId] = useState<string>("essential");

  useEffect(() => {
    const pack = searchParams.get("pack");
    if (pack && PACK_NAMES[pack]) {
      setPackId(pack);
    }
  }, [searchParams]);

  const packName = PACK_NAMES[packId] || "Essentiel";
  const packFeatures = PACK_FEATURES[packId] || PACK_FEATURES.essential;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={lavcomLogo} alt="Lavcom Performances" className="h-8" />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="max-w-lg w-full border-primary/20 shadow-xl">
          <CardContent className="pt-8 pb-8 px-8 text-center space-y-6">
            {/* Success icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-primary/10 p-4 rounded-full">
                  <CheckCircle className="h-16 w-16 text-primary" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Paiement réussi !
              </h1>
              <p className="text-muted-foreground">
                Merci pour votre achat. Votre accès au simulateur est maintenant actif.
              </p>
            </div>

            {/* Pack details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg">Pack {packName}</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {packFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="space-y-3 pt-2">
              <Button asChild size="lg" className="w-full gap-2">
                <Link to="/simulation">
                  Commencer ma simulation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Un email de confirmation a été envoyé à votre adresse.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
