import { Sparkles, Rocket, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingStepWelcomeProps {
  onNext: () => void;
}

export function OnboardingStepWelcome({ onNext }: OnboardingStepWelcomeProps) {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.first_name || "là";

  const features = [
    {
      icon: TrendingUp,
      title: "Analysez vos performances",
      description: "Visualisez votre chiffre d'affaires, transactions et tendances en temps réel."
    },
    {
      icon: Rocket,
      title: "Optimisez votre activité",
      description: "Identifiez vos meilleurs créneaux et machines les plus rentables."
    },
    {
      icon: Shield,
      title: "Données sécurisées",
      description: "Vos données sont protégées et restent confidentielles."
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold font-display mb-2">
          Bienvenue {firstName} ! 🎉
        </h2>
        <p className="text-muted-foreground">
          Lavcom Performances vous aide à piloter vos laveries automatiques avec des analyses détaillées.
        </p>
      </div>

      <div className="grid gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <Button size="lg" onClick={onNext} className="min-w-[200px]">
          C'est parti !
          <Sparkles className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
