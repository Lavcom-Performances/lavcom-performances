import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useViewMode } from "@/hooks/useViewMode";

interface MiniProgressCardProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  className?: string;
}

export function MiniProgressCard({ 
  title, 
  current, 
  target, 
  unit = "€",
  className 
}: MiniProgressCardProps) {
  const { isExpert } = useViewMode();
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isOnTrack = percentage >= 80;
  
  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + "M";
    }
    if (value >= 10000) {
      return (value / 1000).toFixed(0) + "k";
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + "k";
    }
    return value.toLocaleString('fr-FR');
  };
  
  return (
    <div className={cn(
      // Fixed height, consistent with other cards
      "bg-card border border-border rounded-lg p-4 h-[120px] flex flex-col justify-between",
      "transition-all duration-200 hover:shadow-md hover:border-primary/30",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate flex-1">
          {title}
        </p>
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 tabular-nums",
          isOnTrack 
            ? "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400" 
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        )}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      {/* Progress bar */}
      <Progress 
        value={percentage} 
        className={cn(
          "h-2",
          isOnTrack ? "[&>div]:bg-lime-500" : "[&>div]:bg-amber-500"
        )} 
      />
      
      {/* Values */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold text-foreground tabular-nums truncate">
          {formatValue(current)} {unit}
        </span>
        {isExpert && (
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            / {formatValue(target)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}
