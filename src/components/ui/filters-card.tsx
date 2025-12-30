import { ReactNode } from "react";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FiltersCardProps {
  children: ReactNode;
  title?: string;
  resultCount?: number;
  totalCount?: number;
  totalAmount?: number;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export function FiltersCard({
  children,
  title = "Filtres",
  resultCount,
  totalCount,
  totalAmount,
  onReset,
  hasActiveFilters = false,
  className,
}: FiltersCardProps) {
  return (
    <div className={cn(
      "bg-card border border-border rounded-xl overflow-hidden shadow-sm",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        {hasActiveFilters && onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="h-3 w-3" />
            Réinitialiser
          </Button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-5 space-y-4">
        {children}
      </div>
      
      {/* Footer with results */}
      {(resultCount !== undefined || totalAmount !== undefined) && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{resultCount}</span>
            {totalCount !== undefined && resultCount !== totalCount && (
              <span> sur <span className="font-medium">{totalCount}</span></span>
            )}
            {" "}résultat{(resultCount || 0) > 1 ? "s" : ""}
          </p>
          {totalAmount !== undefined && totalAmount > 0 && (
            <p className="text-sm">
              <span className="text-muted-foreground">Total : </span>
              <span className="font-bold text-foreground">{totalAmount.toFixed(2)} €</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
