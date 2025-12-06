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
      "bg-card border border-border rounded-lg p-4 space-y-3",
      className
    )}>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{currentLabel}</p>
          <p className="text-lg font-bold text-foreground">{current}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{previousLabel}</p>
          <p className="text-lg font-semibold text-muted-foreground">{previous}</p>
        </div>
      </div>
      
      <div className={cn(
        "flex items-center gap-1 pt-2 border-t border-border/50",
        isPositive ? "text-lime-600" : isNeutral ? "text-muted-foreground" : "text-red-500"
      )}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : isNeutral ? (
          <Minus className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isPositive ? "+" : ""}{percentageChange.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground ml-1">vs {previousLabel}</span>
      </div>
    </div>
  );
}
