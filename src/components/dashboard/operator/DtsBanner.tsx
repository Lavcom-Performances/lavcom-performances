import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DtsStatus } from "@/hooks/useOperatorDashboard";

interface DtsBannerProps {
  dts: DtsStatus;
}

export function DtsBanner({ dts }: DtsBannerProps) {
  const { t } = useTranslation("app");
  const navigate = useNavigate();
  
  const isLow = dts.score < 60;
  const isMedium = dts.score >= 60 && dts.score < 80;

  const formatCurrency = (cents: number) => {
    const euros = cents / 100;
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(euros);
  };

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 px-4 py-3 rounded-lg border",
      isLow && "bg-destructive/10 border-destructive/30",
      isMedium && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
      !isLow && !isMedium && "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
          isLow ? "bg-destructive/20" : isMedium ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
        )}>
          {isLow ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Shield className={cn("h-4 w-4", isMedium ? "text-amber-600" : "text-emerald-600")} />
          )}
        </div>
        
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {t("operatorDashboard.dts.label", { defaultValue: "Fiabilité des données" })}
            </span>
            <Badge variant={isLow ? "destructive" : isMedium ? "outline" : "secondary"} className="text-xs">
              {dts.score}%
            </Badge>
          </div>
          
          {dts.excluded_revenue_cents > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("operatorDashboard.dts.excluded", { 
                defaultValue: "{{amount}} exclus des calculs",
                amount: formatCurrency(dts.excluded_revenue_cents),
              })}
            </p>
          )}
          
          {dts.top_flags.length > 0 && (
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {dts.top_flags.map((flag, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                  {flag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1 text-xs"
        onClick={() => navigate("/platform/data-trust-score")}
      >
        {t("operatorDashboard.dts.details", { defaultValue: "Détails" })}
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );
}
