import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PaymentModeTooltipProps {
  mode: "CB" | "ESP" | "FI" | "all";
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
}

/**
 * Reusable tooltip component for payment mode explanations.
 * Displays localized explanations for CB, ESP, and FI payment modes.
 */
export function PaymentModeTooltip({ 
  mode, 
  className, 
  iconClassName,
  showIcon = true 
}: PaymentModeTooltipProps) {
  const { t } = useTranslation("app");

  const getTooltipContent = () => {
    switch (mode) {
      case "CB":
        return t("paymentModes.cbTooltip");
      case "ESP":
        return t("paymentModes.espTooltip");
      case "FI":
        return t("paymentModes.fiTooltip");
      case "all":
        return t("paymentModes.allTooltip");
      default:
        return "";
    }
  };

  if (!showIcon) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("cursor-help", className)}>{mode}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">{getTooltipContent()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={cn("h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors", iconClassName, className)} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Legend component explaining CB and ESP abbreviations.
 * Useful under filters or in chart legends.
 */
export function PaymentModeLegend({ className }: { className?: string }) {
  const { t } = useTranslation("app");
  
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {t("paymentModes.legend")}
    </p>
  );
}

/**
 * Get payment mode label for use in charts and tables.
 * Returns the standardized abbreviation (CB, ESP, FI).
 */
export function getPaymentModeLabel(mode: string): string {
  const normalized = mode?.toUpperCase()?.trim();
  switch (normalized) {
    case "CB":
    case "CARTE":
    case "CARTE BANCAIRE":
    case "CARD":
      return "CB";
    case "ESP":
    case "ESPÈCES":
    case "ESPECES":
    case "CASH":
      return "ESP";
    case "FI":
    case "FIDÉLITÉ":
    case "FIDELITE":
    case "LOYALTY":
    case "FREE":
    case "GRATUIT":
      return "FI";
    default:
      return mode || "";
  }
}
