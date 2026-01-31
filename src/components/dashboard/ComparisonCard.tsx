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
      // Fixed height card with clean structure
      "bg-card border border-border rounded-lg p-4 h-[140px] flex flex-col",
      "transition-all duration-200 hover:shadow-md hover:border-primary/30",
      className
    )}>
      {/* Title */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate mb-3">
        {title}
      </p>
      
      {/* Values grid - takes remaining space */}
      <div className="flex-1 grid grid-cols-2 gap-4">
        <div className="flex flex-col justify-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{currentLabel}</p>
          <p className="text-xl font-bold text-foreground tabular-nums truncate">{current}</p>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{previousLabel}</p>
          <p className="text-lg font-semibold text-muted-foreground tabular-nums truncate">{previous}</p>
        </div>
      </div>
      
      {/* Trend indicator */}
      <div className={cn(
        "flex items-center gap-1.5 pt-3 border-t border-border/50 mt-auto",
        isPositive ? "text-lime-600" : isNeutral ? "text-muted-foreground" : "text-red-500"
      )}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 shrink-0" />
        ) : isNeutral ? (
          <Minus className="h-4 w-4 shrink-0" />
        ) : (
          <TrendingDown className="h-4 w-4 shrink-0" />
        )}
        <span className="text-sm font-semibold tabular-nums">
          {isPositive ? "+" : ""}{formatPercentage(percentageChange)}%
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          vs {previousLabel}
        </span>
      </div>
    </div>
  );
}
