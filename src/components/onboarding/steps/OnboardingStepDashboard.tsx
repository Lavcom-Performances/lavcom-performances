import { BarChart3, PieChart, Calendar, TrendingUp, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface OnboardingStepDashboardProps {
  onComplete: () => void;
  onNavigate: (path: string) => void;
}

export function OnboardingStepDashboard({ onComplete, onNavigate }: OnboardingStepDashboardProps) {
  const { t } = useTranslation("app");

  const dashboardFeatures = [
    {
      icon: TrendingUp,
      title: t("onboarding.dashboard.features.revenue.title"),
      description: t("onboarding.dashboard.features.revenue.description")
    },
    {
      icon: PieChart,
      title: t("onboarding.dashboard.features.payments.title"),
      description: t("onboarding.dashboard.features.payments.description")
    },
    {
      icon: Calendar,
      title: t("onboarding.dashboard.features.heatmap.title"),
      description: t("onboarding.dashboard.features.heatmap.description")
    },
    {
      icon: Target,
      title: t("onboarding.dashboard.features.goals.title"),
      description: t("onboarding.dashboard.features.goals.description")
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 mb-4">
          <BarChart3 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold font-display mb-2">
          {t("onboarding.dashboard.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("onboarding.dashboard.subtitle")}
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
            <p className="font-medium">{t("onboarding.dashboard.readyToStart")}</p>
            <p className="text-sm text-muted-foreground">
              {t("onboarding.dashboard.readyToStartDescription")}
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
          {t("onboarding.dashboard.goToDashboard")}
        </Button>
      </div>
    </div>
  );
}
