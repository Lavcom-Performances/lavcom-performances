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
      // Fixed height, clean border, consistent padding
      "bg-card border border-border rounded-lg p-4 h-[120px] flex flex-col justify-between",
      "transition-all duration-200 hover:shadow-md hover:border-primary/30",
      className
    )}>
      {/* Header with icon */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {Icon && (
            <div className={cn(
              "p-1.5 rounded-md shrink-0",
              variant === "default" && "bg-muted",
              variant === "primary" && "bg-primary/10",
              variant === "success" && "bg-lime-100 dark:bg-lime-900/30",
              variant === "warning" && "bg-amber-100 dark:bg-amber-900/30"
            )}>
              <Icon className={cn(
                "h-4 w-4",
                variant === "default" && "text-muted-foreground",
                variant === "primary" && "text-primary",
                variant === "success" && "text-lime-600",
                variant === "warning" && "text-amber-500"
              )} />
            </div>
          )}
          <p className="text-xs font-medium text-muted-foreground truncate uppercase tracking-wide">
            {title}
          </p>
          {helpText && (
            <HelpTooltip content={helpText} side="top" />
          )}
        </div>
      </div>
      
      {/* Value - main focus */}
      <div className="flex-1 flex items-center">
        <p className={cn(
          "text-2xl lg:text-3xl font-bold tracking-tight tabular-nums",
          variant === "primary" && "text-primary",
          variant === "success" && "text-lime-600",
          variant === "warning" && "text-amber-500",
          variant === "default" && "text-foreground"
        )}>
          {value}
        </p>
      </div>

      {/* Footer - subtitle or trend */}
      <div className="h-5 flex items-center">
        {trend ? (
          <div className="flex items-center gap-1">
            {trend.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-lime-600 shrink-0" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
            <span className={cn(
              "text-xs font-semibold",
              trend.isPositive ? "text-lime-600" : "text-red-500"
            )}>
              {trend.isPositive ? "+" : "-"}{formatTrendValue(trend.value)}%
            </span>
            {isExpert && (
              <span className="text-xs text-muted-foreground ml-1">
                vs N-1
              </span>
            )}
          </div>
        ) : subtitle ? (
          <p className="text-xs text-muted-foreground truncate">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
