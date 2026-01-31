import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, Activity, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfitabilityKPIsProps {
  lostRevenue: number;
  avgRotation: number;
  peakSaturation: number;
  peakSlot: string;
  className?: string;
}

export function ProfitabilityKPIs({
  lostRevenue,
  avgRotation,
  peakSaturation,
  peakSlot,
  className
}: ProfitabilityKPIsProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-4", className)}>
      {/* CA Perdu */}
      <div className="dashboard-card h-[140px] border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10">
        <div className="flex items-start justify-between h-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CA Perdu Estimé</span>
            </div>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">-{lostRevenue} €</p>
            <p className="text-xs text-muted-foreground">Pannes & indisponibilités</p>
          </div>
          <AlertTriangle className="h-8 w-8 text-amber-500/20" />
        </div>
      </div>

      {/* Rotation Moyenne */}
      <div className="dashboard-card h-[140px] border-l-4 border-l-primary bg-lime-50/50 dark:bg-lime-900/10">
        <div className="flex items-start justify-between h-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rotation Moyenne</span>
            </div>
            <p className="text-2xl font-bold text-primary tabular-nums">{avgRotation.toFixed(1)} cycles/j</p>
            <div className="flex items-center gap-2">
              <Progress value={(avgRotation / 10) * 100} className="h-1.5 w-20" />
              <span className="text-xs text-muted-foreground">par machine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Saturation Max */}
      <div className={cn(
        "dashboard-card h-[140px] border-l-4",
        peakSaturation > 80 
          ? "border-l-destructive bg-red-50/50 dark:bg-red-900/10" 
          : "border-l-primary bg-lime-50/50 dark:bg-lime-900/10"
      )}>
        <div className="flex items-start justify-between h-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className={cn("h-4 w-4", peakSaturation > 80 ? "text-destructive" : "text-primary")} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Saturation Max</span>
            </div>
            <p className={cn(
              "text-2xl font-bold tabular-nums",
              peakSaturation > 80 ? "text-destructive" : "text-primary"
            )}>
              {peakSaturation}%
            </p>
            <Badge variant={peakSaturation > 80 ? "destructive" : "secondary"} className="text-xs">
              {peakSlot}
            </Badge>
          </div>
          {peakSaturation > 80 && (
            <Badge variant="destructive" className="text-xs h-5">
              Engorgement
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
