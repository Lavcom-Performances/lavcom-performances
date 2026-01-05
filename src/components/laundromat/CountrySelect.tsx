import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

// Countries with their codes and flags
const COUNTRIES = [
  { code: "FR", flag: "🇫🇷", nameKey: "france" },
  { code: "BE", flag: "🇧🇪", nameKey: "belgium" },
  { code: "CH", flag: "🇨🇭", nameKey: "switzerland" },
  { code: "LU", flag: "🇱🇺", nameKey: "luxembourg" },
  { code: "MC", flag: "🇲🇨", nameKey: "monaco" },
  { code: "DE", flag: "🇩🇪", nameKey: "germany" },
  { code: "NL", flag: "🇳🇱", nameKey: "netherlands" },
  { code: "ES", flag: "🇪🇸", nameKey: "spain" },
  { code: "IT", flag: "🇮🇹", nameKey: "italy" },
];

// Country name translations
const COUNTRY_NAMES: Record<string, Record<string, string>> = {
  france: { fr: "France", en: "France", de: "Frankreich", es: "Francia", it: "Francia", nl: "Frankrijk" },
  belgium: { fr: "Belgique", en: "Belgium", de: "Belgien", es: "Bélgica", it: "Belgio", nl: "België" },
  switzerland: { fr: "Suisse", en: "Switzerland", de: "Schweiz", es: "Suiza", it: "Svizzera", nl: "Zwitserland" },
  luxembourg: { fr: "Luxembourg", en: "Luxembourg", de: "Luxemburg", es: "Luxemburgo", it: "Lussemburgo", nl: "Luxemburg" },
  monaco: { fr: "Monaco", en: "Monaco", de: "Monaco", es: "Mónaco", it: "Monaco", nl: "Monaco" },
  germany: { fr: "Allemagne", en: "Germany", de: "Deutschland", es: "Alemania", it: "Germania", nl: "Duitsland" },
  netherlands: { fr: "Pays-Bas", en: "Netherlands", de: "Niederlande", es: "Países Bajos", it: "Paesi Bassi", nl: "Nederland" },
  spain: { fr: "Espagne", en: "Spain", de: "Spanien", es: "España", it: "Spagna", nl: "Spanje" },
  italy: { fr: "Italie", en: "Italy", de: "Italien", es: "Italia", it: "Italia", nl: "Italië" },
};

export function CountrySelect({ value, onChange, disabled, hasError }: CountrySelectProps) {
  const { t, i18n } = useTranslation(['app']);
  
  // Get current language, fallback to French
  const lang = i18n.language?.split('-')[0] || 'fr';
  
  const getCountryName = (nameKey: string) => {
    return COUNTRY_NAMES[nameKey]?.[lang] || COUNTRY_NAMES[nameKey]?.['en'] || nameKey;
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn(hasError && "border-destructive")}>
        <SelectValue placeholder={t('app:newLaundry.countryPlaceholder')} />
      </SelectTrigger>
      <SelectContent className="z-50 bg-popover">
        {COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <span className="flex items-center gap-2">
              <span>{country.flag}</span>
              <span>{getCountryName(country.nameKey)}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Export for use in other components
export { COUNTRIES };
