import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { useAddressSearch, fetchAddressDetails, AddressSearchResult } from "@/hooks/useAddressSearch";
import { useTranslation } from "react-i18next";

interface AutofillData {
  address: string;
  postcode: string;
  city: string;
  department: string;
  country: "FR";
}

interface AddressAutocompleteProps {
  value: string;
  onSelect?: (result: AddressSearchResult) => void;
  onChange?: (value: string) => void;
  onAutofill?: (data: AutofillData) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  countryCode?: string;
  hasError?: boolean;
}

export function AddressAutocomplete({ 
  value, 
  onSelect,
  onChange,
  onAutofill,
  placeholder,
  className,
  disabled = false,
  countryCode = "FR",
  hasError = false,
}: AddressAutocompleteProps) {
  const { t } = useTranslation(['app']);
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const { results, isLoading, manualMode } = useAddressSearch(inputValue, 3, countryCode);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = async (result: AddressSearchResult) => {
    setInputValue(result.address);
    setIsOpen(false);
    
    // Legacy callback
    onSelect?.(result);

    // If we have onAutofill and this is France, try to get detailed info
    if (onAutofill && countryCode === "FR") {
      setIsFetchingDetails(true);
      try {
        // First check if we already have complete data from the result
        if (result.postalCode && result.city) {
          onAutofill({
            address: result.address,
            postcode: result.postalCode,
            city: result.city,
            department: result.department || "",
            country: "FR",
          });
        } else {
          // Fetch detailed info from search endpoint
          const details = await fetchAddressDetails(result.address);
          if (details) {
            onAutofill(details);
          } else {
            // Fallback with what we have
            onAutofill({
              address: result.address,
              postcode: result.postalCode || "",
              city: result.city || "",
              department: result.department || "",
              country: "FR",
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch address details:", err);
        // Fallback with partial data
        onAutofill({
          address: result.address,
          postcode: result.postalCode || "",
          city: result.city || "",
          department: result.department || "",
          country: "FR",
        });
      } finally {
        setIsFetchingDetails(false);
      }
    } else if (onAutofill) {
      // Non-FR country
      onAutofill({
        address: result.address,
        postcode: result.postalCode || "",
        city: result.city || "",
        department: result.department || "",
        country: "FR", // Keep as FR for now, could be extended
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    onChange?.(newValue);
  };

  const defaultPlaceholder = t('app:newLaundry.addressPlaceholder', 'Rechercher une adresse...');
  const showLoading = isLoading || isFetchingDetails;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || defaultPlaceholder}
          className={cn("pl-10", hasError && "border-destructive focus-visible:ring-destructive")}
          disabled={disabled}
          autoComplete="off"
        />
        {showLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((result, index) => (
            <button
              key={`${result.postalCode}-${result.city}-${index}`}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
            >
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{result.address}</span>
                {(result.postalCode || result.city) && (
                  <span className="text-xs text-muted-foreground truncate">
                    {result.postalCode} {result.city}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && inputValue.length >= 3 && !isLoading && results.length === 0 && !manualMode && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
          {t('app:newLaundry.noAddressFound', 'Aucune adresse trouvée')}
        </div>
      )}

      {manualMode && (
        <div className="flex items-center gap-2 mt-1.5 text-xs text-amber-600 dark:text-amber-500">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>Mode saisie manuelle (service indisponible). Réessayez en retapant l'adresse.</span>
        </div>
      )}
    </div>
  );
}
