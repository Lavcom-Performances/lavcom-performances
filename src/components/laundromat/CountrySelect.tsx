import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES } from "@/hooks/useCitySearch";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export function CountrySelect({ value, onChange, disabled, hasError }: CountrySelectProps) {
  const { t } = useTranslation(['app']);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn(hasError && "border-destructive")}>
        <SelectValue placeholder={t('app:addLaundromat.countryPlaceholder', 'Sélectionner un pays')} />
      </SelectTrigger>
      <SelectContent className="z-50 bg-popover">
        {COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <span className="flex items-center gap-2">
              <span>{country.flag}</span>
              <span>{country.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
