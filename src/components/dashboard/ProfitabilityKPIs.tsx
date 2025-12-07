import { Card, CardContent } from "@/components/ui/card";
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
      <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-muted-foreground">CA Perdu Estimé</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">-{lostRevenue} €</p>
              <p className="text-xs text-muted-foreground">Pannes & indisponibilités</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500/30" />
          </div>
        </CardContent>
      </Card>

      {/* Rotation Moyenne */}
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Rotation Moyenne</span>
              </div>
              <p className="text-2xl font-bold text-primary">{avgRotation.toFixed(1)} cycles/j</p>
              <div className="flex items-center gap-2">
                <Progress value={(avgRotation / 10) * 100} className="h-1.5 w-20" />
                <span className="text-xs text-muted-foreground">par machine</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saturation Max */}
      <Card className={cn(
        "border-l-4",
        peakSaturation > 80 
          ? "border-l-destructive bg-destructive/5" 
          : "border-l-primary bg-primary/5"
      )}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium text-muted-foreground">Saturation Max</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                peakSaturation > 80 ? "text-destructive" : "text-primary"
              )}>
                {peakSaturation}%
              </p>
              <Badge variant={peakSaturation > 80 ? "destructive" : "secondary"} className="text-xs">
                {peakSlot}
              </Badge>
            </div>
            {peakSaturation > 80 && (
              <Badge variant="destructive" className="text-xs">
                Engorgement
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
