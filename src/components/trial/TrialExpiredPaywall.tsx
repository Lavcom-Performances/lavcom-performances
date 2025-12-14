import { Link } from "react-router-dom";
import { Lock, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import lavcomLogo from "@/assets/lavcom-analytics-logo.png";

interface TrialExpiredPaywallProps {
  onContactSupport?: () => void;
}

export function TrialExpiredPaywall({ onContactSupport }: TrialExpiredPaywallProps) {
  const features = [
    "Dashboard multi-laveries illimité",
    "Export PDF de tous vos rapports",
    "Recommandations intelligentes IA",
    "Maintenance prédictive",
    "Support prioritaire",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      {/* Blurred background effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-lg border-2 border-destructive/20 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-display">
            Votre essai gratuit est terminé
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Continuez à optimiser vos laveries avec Lavcom Analytics Pro
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Analytics" 
              className="h-10 mx-auto mb-4 opacity-50"
            />
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Inclus dans le plan Pro
            </h4>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <Link to="/pricing" className="block">
              <Button variant="lavcom" size="xl" className="w-full">
                <Sparkles className="h-5 w-5 mr-2" />
                Voir les plans et tarifs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <p className="text-center text-sm text-muted-foreground">
              À partir de 29€/mois par laverie
            </p>

            <div className="pt-4 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                Une question ?{" "}
                <button 
                  onClick={onContactSupport}
                  className="text-primary hover:underline font-medium"
                >
                  Contactez notre équipe
                </button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
