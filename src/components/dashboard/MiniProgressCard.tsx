import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

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
  const percentage = Math.min((current / target) * 100, 100);
  const isOnTrack = percentage >= 80;
  
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-4 space-y-3",
      className
    )}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          isOnTrack ? "bg-lime-100 text-lime-700" : "bg-amber-100 text-amber-700"
        )}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      <Progress 
        value={percentage} 
        className={cn(
          "h-2",
          isOnTrack ? "[&>div]:bg-lime-500" : "[&>div]:bg-amber-500"
        )} 
      />
      
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-foreground">
          {current.toLocaleString('fr-FR')} {unit}
        </span>
        <span className="text-muted-foreground">
          / {target.toLocaleString('fr-FR')} {unit}
        </span>
      </div>
    </div>
  );
}
