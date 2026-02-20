import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2 } from "lucide-react";
import { useCitySearch, CitySearchResult } from "@/hooks/useCitySearch";
import { useTranslation } from "react-i18next";

interface CityAutocompleteProps {
  value: string;
  onSelect: (result: CitySearchResult) => void;
  placeholder?: string;
  className?: string;
  country?: string;
  hasError?: boolean;
}

export function CityAutocomplete({ 
  value, 
  onSelect, 
  placeholder = "Rechercher une ville...",
  className,
  country = "FR",
  hasError = false
}: CityAutocompleteProps) {
  const { t } = useTranslation(['app']);
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  // Only skip search when user just selected a result, not when there's an initial value
  const [justSelected, setJustSelected] = useState(false);
  const { results, isLoading } = useCitySearch(justSelected ? "" : inputValue, 2, country);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with external value changes (e.g., reset)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: CitySearchResult) => {
    setInputValue(result.city);
    setJustSelected(true);
    onSelect(result);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setJustSelected(false);
    setIsOpen(true);
  };

  const handleFocus = () => {
    // Reset justSelected flag when user focuses to allow new search
    setJustSelected(false);
    if (inputValue.length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={cn("pl-10", hasError && "border-destructive focus-visible:ring-destructive")}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((result, index) => (
            <button
              key={`${result.postalCode}-${index}`}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
            >
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{result.label}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && inputValue.length >= 2 && !isLoading && results.length === 0 && !justSelected && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
          {t('app:newLaundry.noCityFound', 'Aucune ville trouvée')}
        </div>
      )}
    </div>
  );
}
