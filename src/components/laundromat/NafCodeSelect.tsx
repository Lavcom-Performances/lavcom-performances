import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { nafCodes, NafCode } from "@/data/nafCodes";
import { useTranslation } from "react-i18next";

interface NafCodeSelectProps {
  value: string;
  onChange: (code: string, label?: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

// Add "Other" option
const OTHER_OPTION = { code: "OTHER", label: "Autre code NAF" };

export function NafCodeSelect({ value, onChange, disabled, hasError }: NafCodeSelectProps) {
  const { t } = useTranslation(['app']);
  const [open, setOpen] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const allOptions = [...nafCodes, OTHER_OPTION];
  const selectedNaf = nafCodes.find(n => n.code === value);
  const isOther = value === "OTHER" || (value && !selectedNaf);

  const displayValue = selectedNaf 
    ? `${selectedNaf.code} – ${selectedNaf.label}`
    : isOther && value !== "OTHER"
      ? value
      : value === "OTHER"
        ? t('app:addLaundromat.nafOther', 'Autre code NAF')
        : "";

  const handleSelect = (code: string) => {
    if (code === "OTHER") {
      setShowCustomInput(true);
      onChange("OTHER");
    } else {
      setShowCustomInput(false);
      const naf = nafCodes.find(n => n.code === code);
      onChange(code, naf?.label);
    }
    setOpen(false);
  };

  const handleCustomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setCustomCode(val);
    onChange(val);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground",
              hasError && "border-destructive"
            )}
          >
            {displayValue || t('app:addLaundromat.nafPlaceholder', 'Sélectionner un code NAF...')}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 z-50" align="start">
          <Command>
            <CommandInput placeholder={t('app:addLaundromat.nafSearch', 'Rechercher un code NAF...')} />
            <CommandList>
              <CommandEmpty>{t('app:addLaundromat.nafNotFound', 'Aucun code trouvé')}</CommandEmpty>
              <CommandGroup>
                {allOptions.map((naf) => (
                  <CommandItem
                    key={naf.code}
                    value={`${naf.code} ${naf.label}`}
                    onSelect={() => handleSelect(naf.code)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === naf.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-mono text-sm mr-2">{naf.code}</span>
                    <span className="text-muted-foreground">{naf.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Custom input for "Other" */}
      {(showCustomInput || (isOther && value !== "OTHER")) && (
        <input
          type="text"
          placeholder={t('app:addLaundromat.nafCustomPlaceholder', 'Ex: 47.19B')}
          value={customCode || (value !== "OTHER" ? value : "")}
          onChange={handleCustomCodeChange}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
    </div>
  );
}
