/**
 * TAEX-302: SaaS messaging hook for manual recommendation suppression
 * 
 * Shown when recommendations are manually suppressed by support.
 * Different from DTSFeedbackBanner which is shown for low DTS scores.
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RecommendationsSuppressedBannerProps {
  className?: string;
}

export function RecommendationsSuppressedBanner({ className }: RecommendationsSuppressedBannerProps) {
  const { t } = useTranslation("app");

  return (
    <Alert className={className}>
      <Info className="h-4 w-4" />
      <AlertTitle>
        {t("recommendations.suppressed.title", "Recommandations en pause")}
      </AlertTitle>
      <AlertDescription>
        {t(
          "recommendations.suppressed.description",
          "Les recommandations sont temporairement suspendues par le support pendant que nous examinons la qualité de vos données. Elles seront réactivées automatiquement une fois la vérification terminée."
        )}
      </AlertDescription>
    </Alert>
  );
}

export default RecommendationsSuppressedBanner;
