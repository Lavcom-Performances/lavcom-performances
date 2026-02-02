import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBetaOnboarding } from "@/hooks/useBetaOnboarding";
import { cn } from "@/lib/utils";

interface BetaIndicatorProps {
  variant?: "default" | "compact";
  className?: string;
}

export function BetaIndicator({ variant = "default", className }: BetaIndicatorProps) {
  const { isBeta, isLoading, betaEndsAt } = useBetaOnboarding();

  if (isLoading || !isBeta) return null;

  const formattedEndDate = betaEndsAt
    ? format(new Date(betaEndsAt), "d MMMM yyyy", { locale: fr })
    : "date à confirmer";

  const tooltipContent = `Vous êtes dans le programme bêta payant jusqu'au ${formattedEndDate}.`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/beta"
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
              "bg-primary/10 text-primary hover:bg-primary/20",
              variant === "compact" && "px-1.5 py-0.5",
              className
            )}
          >
            <Sparkles className={cn("h-3 w-3", variant === "compact" && "h-2.5 w-2.5")} />
            <span>Beta</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
