import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

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
}

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  className,
  variant = "default"
}: KPICardProps) {
  return (
    <div className={cn(
      "kpi-card animate-fade-in",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn(
            "text-2xl font-display font-bold tracking-tight",
            variant === "primary" && "text-primary",
            variant === "success" && "text-lime-600",
            variant === "warning" && "text-amber-500"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "p-2 rounded-lg",
            variant === "default" && "bg-muted",
            variant === "primary" && "bg-primary/10",
            variant === "success" && "bg-lime-100",
            variant === "warning" && "bg-amber-100"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              variant === "default" && "text-muted-foreground",
              variant === "primary" && "text-primary",
              variant === "success" && "text-lime-600",
              variant === "warning" && "text-amber-500"
            )} />
          </div>
        )}
      </div>
      
      {trend && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
          {trend.isPositive ? (
            <TrendingUp className="h-4 w-4 text-lime-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={cn(
            "text-sm font-medium",
            trend.isPositive ? "text-lime-600" : "text-red-600"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </span>
          <span className="text-xs text-muted-foreground">vs période précédente</span>
        </div>
      )}
    </div>
  );
}
