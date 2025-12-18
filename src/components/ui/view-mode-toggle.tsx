import { Eye, Sparkles } from "lucide-react";
import { useViewMode } from "@/hooks/useViewMode";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ViewModeToggleProps {
  className?: string;
  variant?: "default" | "compact";
}

export function ViewModeToggle({ className, variant = "default" }: ViewModeToggleProps) {
  const { viewMode, setViewMode, isExpert } = useViewMode();

  return (
    <TooltipProvider>
      <div className={cn(
        "flex items-center gap-1 p-1 bg-muted rounded-lg",
        className
      )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setViewMode("simple")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === "simple"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <Eye className="h-4 w-4" />
              {variant === "default" && <span>Simplifiée</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Vue simplifiée - KPIs essentiels</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setViewMode("expert")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === "expert"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <Sparkles className="h-4 w-4" />
              {variant === "default" && <span>Experte</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Vue experte - Toutes les analyses</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
