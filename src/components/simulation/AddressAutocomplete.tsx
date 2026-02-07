import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AddressResult {
  label: string;
  address: string;
  city: string;
  postalCode: string;
  department: string;
}

interface AddressAutocompleteProps {
  value: string;
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

function useAddressSearch(query: string, minChars: number = 3) {
  const [results, setResults] = useState<AddressResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      // Search all address types (streets, housenumbers, localities)
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=10`;
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Erreur lors de la recherche");
      }

      const data = await response.json();
      
      // Filter to get relevant results and format them
      const formattedResults: AddressResult[] = data.features
        .filter((feature: any) => feature.properties && feature.properties.label)
        .map((feature: any) => {
          const props = feature.properties;
          return {
            label: props.label || '',
            address: props.name || props.label || '',
            city: props.city || '',
            postalCode: props.postcode || '',
            department: props.context?.split(',')[0]?.trim() || '',
          };
        });

      setResults(formattedResults);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [minChars]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchAddresses(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, searchAddresses]);

  return { results, isLoading };
}

export function AddressAutocomplete({ 
  value, 
  onSelect, 
  placeholder = "Rechercher une adresse...",
  className,
  hasError = false
}: AddressAutocompleteProps) {
  const { t } = useTranslation(['app']);
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  // Track if user just selected to avoid re-searching
  const [justSelected, setJustSelected] = useState(false);
  // Only search when user is actively typing, not when value comes from props
  const [isUserTyping, setIsUserTyping] = useState(false);
  const { results, isLoading } = useAddressSearch(
    (justSelected || !isUserTyping) ? "" : inputValue, 
    3
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input value with external prop changes (e.g., from localStorage)
  useEffect(() => {
    setInputValue(value);
    // Don't trigger search when value comes from props
    setIsUserTyping(false);
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

  const handleSelect = (result: AddressResult) => {
    setInputValue(result.address);
    setJustSelected(true);
    setIsUserTyping(false);
    onSelect(result);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setJustSelected(false);
    setIsUserTyping(true);
    setIsOpen(true);
  };

  const handleFocus = () => {
    setJustSelected(false);
    // Allow searching when user focuses on the field
    if (inputValue.length >= 3) {
      setIsUserTyping(true);
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
              key={`${result.postalCode}-${result.address}-${index}`}
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

      {isOpen && inputValue.length >= 3 && !isLoading && results.length === 0 && isUserTyping && !justSelected && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
          {t('app:newLaundry.noAddressFound', 'Aucune adresse trouvée. Essayez avec le nom de la ville.')}
        </div>
      )}
    </div>
  );
}
