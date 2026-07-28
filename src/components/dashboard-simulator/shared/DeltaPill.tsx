import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaPillProps {
  /** Text to display, e.g. "+ 1 700 €/mois" */
  label: string;
  /** Optional secondary text, e.g. "(+44 %)" */
  hint?: string;
  direction: "up" | "down" | "neutral";
  className?: string;
}

export function DeltaPill({ label, hint, direction, className }: DeltaPillProps) {
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        direction === "up" && "bg-primary/15 text-primary",
        direction === "down" && "bg-destructive/10 text-destructive",
        direction === "neutral" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {hint ? <span className="opacity-70">{hint}</span> : null}
    </span>
  );
}
