import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock, WashingMachine, Wind, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MaintenanceAlert {
  machineId: string;
  machineName: string;
  type: "washer" | "dryer";
  status: "warning" | "critical" | "ok";
  message: string;
  lastMaintenance?: string;
  cyclesSinceMaintenance?: number;
}

interface MaintenanceAlertsProps {
  alerts: MaintenanceAlert[];
  className?: string;
}

export function MaintenanceAlerts({ alerts, className }: MaintenanceAlertsProps) {
  const criticalCount = alerts.filter(a => a.status === "critical").length;
  const warningCount = alerts.filter(a => a.status === "warning").length;
  
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Alertes maintenance
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} critique{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                {warningCount} attention
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[250px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-lime-600 p-3 bg-lime-50 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Toutes les machines sont opérationnelles</span>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.machineId}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  alert.status === "critical" && "bg-red-50 border-red-200",
                  alert.status === "warning" && "bg-amber-50 border-amber-200",
                  alert.status === "ok" && "bg-muted/30 border-border"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-full",
                  alert.status === "critical" && "bg-red-100",
                  alert.status === "warning" && "bg-amber-100",
                  alert.status === "ok" && "bg-muted"
                )}>
                  {alert.type === "washer" ? (
                    <WashingMachine className={cn(
                      "h-4 w-4",
                      alert.status === "critical" && "text-red-600",
                      alert.status === "warning" && "text-amber-600",
                      alert.status === "ok" && "text-muted-foreground"
                    )} />
                  ) : (
                    <Wind className={cn(
                      "h-4 w-4",
                      alert.status === "critical" && "text-red-600",
                      alert.status === "warning" && "text-amber-600",
                      alert.status === "ok" && "text-muted-foreground"
                    )} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{alert.machineName}</p>
                  <p className={cn(
                    "text-xs",
                    alert.status === "critical" && "text-red-600",
                    alert.status === "warning" && "text-amber-600",
                    alert.status === "ok" && "text-muted-foreground"
                  )}>
                    {alert.message}
                  </p>
                  {alert.lastMaintenance && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Dernière: {alert.lastMaintenance}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
