import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  content: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconClassName?: string;
}

export function HelpTooltip({ 
  content, 
  side = "top", 
  className,
  iconClassName 
}: HelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
          >
            <HelpCircle className={cn("h-3.5 w-3.5", iconClassName)} />
            <span className="sr-only">Aide</span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className="max-w-xs text-xs leading-relaxed"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
