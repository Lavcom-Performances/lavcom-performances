import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "positive" | "negative";
  className?: string;
}

export function KpiTile({ label, value, hint, tone = "default", className }: KpiTileProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-3 shadow-form", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "positive" && "text-primary",
          tone === "negative" && "text-destructive",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
