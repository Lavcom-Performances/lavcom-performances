import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { SUBSCRIPTION_CATEGORIES } from "@/config/simulatorFormOptions";

interface Props {
  label?: string;
  subscription?: boolean;
  other?: boolean;
  value: number;
  suffix?: string;
  placeholder?: string;
  onChangeLabel?: (value: string) => void;
  onChangeValue: (value: number) => void;
  onRemove?: () => void;
}

export function CostRow({
  label,
  subscription,
  other,
  value,
  suffix = "€/mois",
  placeholder = "0",
  onChangeLabel,
  onChangeValue,
  onRemove
}: Props) {
  const items: [string, {label: string; category:string}][] = Object.entries(SUBSCRIPTION_CATEGORIES);
  return (
    <div className="flex gap-3 items-center">
      { label && !other && !subscription && (
        <span className="text-sm text-foreground grow">{label}</span>
      )}
      { subscription && (
        <Select defaultValue={label}>
          <SelectTrigger className="grow w-min bg-white shadow-form text-left">
            <SelectValue placeholder="Abonnement..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item[0]} value={item[1].label}>
                  {item[1].label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
      { other && (
        <Input
          type="text"
          value={label || ""}
          placeholder="Libellé"
          onChange={(e) => onChangeLabel?.(e.target.value)}
          className="bg-white shadow-form w-min"
        />
      )}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChangeValue(Number(e.target.value))}
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
