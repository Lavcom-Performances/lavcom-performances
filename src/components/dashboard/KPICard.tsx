import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { useViewMode } from "@/hooks/useViewMode";
import { HelpTooltip } from "@/components/ui/help-tooltip";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: "default" | "primary" | "success" | "warning";
  helpText?: string;
}

// Format trend value to reasonable precision
function formatTrendValue(value: number): string {
  if (Math.abs(value) >= 10) {
    return Math.round(value).toString();
  }
  if (Math.abs(value) >= 1) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  className,
  variant = "default",
  helpText
}: KPICardProps) {
  const { isExpert } = useViewMode();

  return (
    <div className={cn(
      "kpi-card animate-fade-in",
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            {helpText && (
              <HelpTooltip content={helpText} side="top" />
            )}
          </div>
          <p className={cn(
            "text-lg sm:text-xl lg:text-2xl font-display font-bold tracking-tight truncate",
            variant === "primary" && "text-primary",
            variant === "success" && "text-lime-600",
            variant === "warning" && "text-amber-500"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "p-1.5 sm:p-2 rounded-lg shrink-0",
            variant === "default" && "bg-muted",
            variant === "primary" && "bg-primary/10",
            variant === "success" && "bg-lime-100 dark:bg-lime-900/30",
            variant === "warning" && "bg-amber-100 dark:bg-amber-900/30"
          )}>
            <Icon className={cn(
              "h-4 w-4 sm:h-5 sm:w-5",
              variant === "default" && "text-muted-foreground",
              variant === "primary" && "text-primary",
              variant === "success" && "text-lime-600",
              variant === "warning" && "text-amber-500"
            )} />
          </div>
        )}
      </div>
      
      {trend && (
        <div className="flex items-center gap-1 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50">
          {trend.isPositive ? (
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-lime-600 shrink-0" />
          ) : (
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 shrink-0" />
          )}
          <span className={cn(
            "text-xs sm:text-sm font-medium whitespace-nowrap",
            trend.isPositive ? "text-lime-600" : "text-red-600"
          )}>
            {trend.isPositive ? "+" : "-"}{formatTrendValue(trend.value)}%
          </span>
          {/* Show label only in expert mode and on larger screens */}
          {isExpert && (
            <span className="hidden sm:inline text-[10px] sm:text-xs text-muted-foreground truncate">
              vs précédent
            </span>
          )}
        </div>
      )}
    </div>
  );
}
