import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calculator, Target, AlertCircle } from "lucide-react";
import { useSiteCosts } from "@/hooks/useSiteCosts";
import { useUserGoals } from "@/hooks/useUserGoals";
import { useCurrentSite } from "@/hooks/useCurrentSite";

interface CostsConfigBannerProps {
  showGoals?: boolean;
}

export function CostsConfigBanner({ showGoals = false }: CostsConfigBannerProps) {
  const { t } = useTranslation("app");
  const navigate = useNavigate();
  const { currentSiteId } = useCurrentSite();
  const { hasCosts, isLoading: costsLoading } = useSiteCosts(currentSiteId);
  const { goals, isLoading: goalsLoading } = useUserGoals(currentSiteId);

  const hasGoals = goals && 'id' in goals;

  // Don't show if loading
  if (costsLoading || goalsLoading) return null;

  // Don't show if all configured
  if (hasCosts && (!showGoals || hasGoals)) return null;

  return (
    <div className="space-y-2">
      {!hasCosts && (
        <div className="flex items-center justify-between gap-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-foreground">
              {t("costs.bannerMessage")}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/settings/charges")}
            className="gap-2 flex-shrink-0"
          >
            <Calculator className="h-4 w-4" />
            {t("costs.bannerCta")}
          </Button>
        </div>
      )}

      {showGoals && !hasGoals && (
        <div className="flex items-center justify-between gap-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-foreground">
              {t("goals.bannerMessage")}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/settings/objectives")}
            className="gap-2 flex-shrink-0"
          >
            <Target className="h-4 w-4" />
            {t("goals.bannerCta")}
          </Button>
        </div>
      )}
    </div>
  );
}
