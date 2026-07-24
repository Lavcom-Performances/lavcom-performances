import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  label?: string;
  other?: Boolean;
  value: number;
  suffix?: string;
  placeholder?: string;
  onChangeLabel?: (value: string) => void;
  onChangeAmount: (value: number) => void;
  onRemove?: () => void;
}

export function CostRow({
  label,
  other,
  value,
  suffix = "€/mois",
  placeholder = "Montant",
  onChangeLabel,
  onChangeAmount,
  onRemove
}: Props) {
  
  return (
    <div className="flex gap-3 items-center">
      { label && !other && (
        <span className="text-sm text-foreground grow">{label}</span>
      )}
      { other && (
        <Input
          type="text"
          value={label || ""}
          placeholder="Libellé"
          onChange={(e) => onChangeLabel(e.target.value)}
          className="bg-white shadow-form w-min"
        />
      )}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChangeAmount(Number(e.target.value))}
          className="bg-white shadow-form text-right w-24"
        />
        <span className="whitespace-nowrap text-xs text-muted-foreground">{suffix}</span>
      </div>
      {onRemove ? (
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ) : (
        <span className="hidden md:block md:w-9" />
      )}
    </div>
  );
}
