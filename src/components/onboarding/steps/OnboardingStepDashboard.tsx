import { BarChart3, PieChart, Calendar, TrendingUp, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingStepDashboardProps {
  onComplete: () => void;
  onNavigate: (path: string) => void;
}

export function OnboardingStepDashboard({ onComplete, onNavigate }: OnboardingStepDashboardProps) {
  const dashboardFeatures = [
    {
      icon: TrendingUp,
      title: "Chiffre d'affaires",
      description: "Vue d'ensemble de vos revenus journaliers, mensuels et annuels."
    },
    {
      icon: PieChart,
      title: "Répartition des paiements",
      description: "Analyse par mode de paiement (CB, ESP, FI)."
    },
    {
      icon: Calendar,
      title: "Heatmap des ventes",
      description: "Visualisez vos meilleurs créneaux horaires."
    },
    {
      icon: Target,
      title: "Objectifs",
      description: "Définissez et suivez vos objectifs de performance."
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 mb-4">
          <BarChart3 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold font-display mb-2">
          Découvrez votre dashboard
        </h2>
        <p className="text-muted-foreground">
          Tout est prêt ! Voici ce que vous pouvez faire avec Lavcom Performances.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {dashboardFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Prêt à commencer ?</p>
            <p className="text-sm text-muted-foreground">
              Accédez à votre tableau de bord et explorez vos données.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <Button 
          size="lg" 
          onClick={() => onNavigate('/dashboard')}
          className="min-w-[250px]"
        >
          <BarChart3 className="mr-2 h-5 w-5" />
          Aller au dashboard
        </Button>
      </div>
    </div>
  );
}
