import { cn } from "@/lib/utils";

interface OperationsKPIRowProps {
  label: string;
  labelSub?: string;
  total: number;
  cb: number;
  esp: number;
  isHighlighted?: boolean;
}

export function OperationsKPIRow({ 
  label, 
  labelSub,
  total, 
  cb, 
  esp, 
  isHighlighted = false 
}: OperationsKPIRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "px-3 py-2 rounded-lg text-center min-w-[90px]",
        isHighlighted ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        <div className="text-lg font-bold">{total.toFixed(0)} €</div>
        <div className="text-xs uppercase opacity-80">CA Total</div>
      </div>
      <div className="px-3 py-2 text-center min-w-[70px]">
        <div className="text-lg font-semibold text-foreground">{cb.toFixed(0)} €</div>
        <div className="text-xs text-muted-foreground uppercase">CA CB</div>
      </div>
      <div className="px-3 py-2 text-center min-w-[70px]">
        <div className="text-lg font-semibold text-foreground">{esp.toFixed(0)} €</div>
        <div className="text-xs text-muted-foreground uppercase">CA ESP</div>
      </div>
      <div className="flex flex-col justify-center ml-2">
        <span className={cn(
          "text-xs font-semibold uppercase px-2 py-0.5 rounded",
          isHighlighted ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {label}
        </span>
        {labelSub && (
          <span className="text-xs text-muted-foreground">{labelSub}</span>
        )}
      </div>
    </div>
  );
}
