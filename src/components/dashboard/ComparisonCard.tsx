import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ComparisonCardProps {
  title: string;
  current: string;
  previous: string;
  currentLabel?: string;
  previousLabel?: string;
  percentageChange: number;
  className?: string;
}

// Format percentage to reasonable precision
function formatPercentage(value: number): string {
  if (Math.abs(value) >= 10) {
    return Math.round(value).toString();
  }
  if (Math.abs(value) >= 1) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}

export function ComparisonCard({ 
  title, 
  current, 
  previous, 
  currentLabel = "Actuel",
  previousLabel = "N-1",
  percentageChange,
  className 
}: ComparisonCardProps) {
  const isPositive = percentageChange > 0;
  const isNeutral = percentageChange === 0;
  
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3",
      className
    )}>
      <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
        {title}
      </p>
      
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">{currentLabel}</p>
          <p className="text-base sm:text-lg font-bold text-foreground truncate">{current}</p>
        </div>
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">{previousLabel}</p>
          <p className="text-base sm:text-lg font-semibold text-muted-foreground truncate">{previous}</p>
        </div>
      </div>
      
      <div className={cn(
        "flex items-center gap-1 pt-2 border-t border-border/50",
        isPositive ? "text-lime-600" : isNeutral ? "text-muted-foreground" : "text-red-500"
      )}>
        {isPositive ? (
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
        ) : isNeutral ? (
          <Minus className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
        ) : (
          <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
        )}
        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
          {isPositive ? "+" : ""}{formatPercentage(percentageChange)}%
        </span>
        <span className="hidden sm:inline text-[10px] sm:text-xs text-muted-foreground ml-1">
          vs {previousLabel}
        </span>
      </div>
    </div>
  );
}
