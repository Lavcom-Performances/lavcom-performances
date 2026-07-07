import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  label: string;
  amount?: number;
  suffix?: string;
  placeholder?: string;
  onRemove?: () => void;
}

export function CostRow({ label, amount, suffix = "€/mois", placeholder, onRemove }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_140px_auto] md:items-center">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          defaultValue={amount ?? ""}
          placeholder={placeholder}
          className="text-right"
        />
        <span className="whitespace-nowrap text-xs text-muted-foreground">{suffix}</span>
      </div>
      {onRemove ? (
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      ) : (
        <span className="hidden md:block md:w-9" />
      )}
    </div>
  );
}
