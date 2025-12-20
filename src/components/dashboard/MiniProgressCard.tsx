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
  
  // Format large numbers compactly
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
      "bg-card border border-border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3",
      className
    )}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate flex-1">
          {title}
        </p>
        <span className={cn(
          "text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full shrink-0",
          isOnTrack 
            ? "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400" 
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        )}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      <Progress 
        value={percentage} 
        className={cn(
          "h-1.5 sm:h-2",
          isOnTrack ? "[&>div]:bg-lime-500" : "[&>div]:bg-amber-500"
        )} 
      />
      
      <div className="flex items-baseline justify-between text-xs sm:text-sm gap-1">
        <span className="font-semibold text-foreground truncate">
          {formatValue(current)} {unit}
        </span>
        {isExpert && (
          <span className="text-muted-foreground shrink-0">
            / {formatValue(target)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}
