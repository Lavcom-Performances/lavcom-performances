/**
 * CityAutocomplete.tsx
 * 
 * Autocomplete component for French cities using api-adresse.data.gouv.fr
 * Features:
 * - Searches cities/communes with autocomplete
 * - Returns city name, postal code, and department code
 * - Handles multiple postal codes for large cities
 * - Fallback to manual input on API failure
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface CitySearchResult {
  city: string;
  postalCode: string;
  departmentCode: string;
  context: string;
  postalCodes?: string[]; // For cities with multiple postal codes
}

interface CityAutocompleteProps {
  value: string;
  postalCode?: string;
  onSelect: (result: CitySearchResult) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
  fallbackMode?: boolean;
  onFallbackModeChange?: (fallback: boolean) => void;
}

// Derive department code from postal code (handles Corsica)
export function deriveDepartmentCode(postalCode: string): string {
  if (!postalCode || postalCode.length < 2) return "";
  
  const prefix = postalCode.substring(0, 2);
  
  // Corsica special cases
  if (prefix === "20") {
    const fullPrefix = postalCode.substring(0, 3);
    if (fullPrefix === "200" || fullPrefix === "201") {
      return "2A"; // Corse-du-Sud
    }
    if (fullPrefix === "202" || fullPrefix === "206") {
      return "2B"; // Haute-Corse
    }
    // Default for ambiguous cases
    return postalCode.charAt(2) === "0" || postalCode.charAt(2) === "1" ? "2A" : "2B";
  }
  
  // DOM-TOM
  if (prefix === "97" || prefix === "98") {
    return postalCode.substring(0, 3);
  }
  
  return prefix;
}

export function CityAutocomplete({ 
  value, 
  postalCode: initialPostalCode,
  onSelect,
  onChange,
  placeholder,
  className,
  disabled = false,
  hasError = false,
  fallbackMode = false,
  onFallbackModeChange,
}: CityAutocompleteProps) {
  const { t } = useTranslation(['app']);
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [showPostalCodeSelector, setShowPostalCodeSelector] = useState(false);
  const [pendingResult, setPendingResult] = useState<CitySearchResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowPostalCodeSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setApiError(false);

    try {
      // Use the French gov API to search for municipalities
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,code,codeDepartement,codesPostaux,population&boost=population&limit=10`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error("API error");
      }

      const cities = await response.json();

      const formattedResults: CitySearchResult[] = cities.map((city: any) => {
        const postalCodes: string[] = city.codesPostaux || [];
        const primaryPostalCode = postalCodes[0] || "";
        const deptCode = city.codeDepartement || deriveDepartmentCode(primaryPostalCode);
        
        return {
          city: city.nom,
          postalCode: primaryPostalCode,
          departmentCode: deptCode,
          context: `${primaryPostalCode} - Dép. ${deptCode}`,
          postalCodes: postalCodes.length > 1 ? postalCodes : undefined,
        };
      });

      setResults(formattedResults);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      console.error("[CityAutocomplete] API error:", err);
      setApiError(true);
      setResults([]);
      
      // Enable fallback mode
      if (onFallbackModeChange) {
        onFallbackModeChange(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onFallbackModeChange]);

  useEffect(() => {
    if (fallbackMode || disabled) return;
    
    const debounceTimer = setTimeout(() => {
      searchCities(inputValue);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [inputValue, fallbackMode, disabled, searchCities]);

  const handleSelect = (result: CitySearchResult) => {
    // If city has multiple postal codes, show selector
    if (result.postalCodes && result.postalCodes.length > 1) {
      setPendingResult(result);
      setShowPostalCodeSelector(true);
      setIsOpen(false);
      return;
    }

    finalizeSelection(result);
  };

  const handlePostalCodeSelect = (postalCode: string) => {
    if (!pendingResult) return;
    
    const finalResult: CitySearchResult = {
      ...pendingResult,
      postalCode,
      departmentCode: deriveDepartmentCode(postalCode),
      context: `${postalCode} - Dép. ${deriveDepartmentCode(postalCode)}`,
    };
    
    finalizeSelection(finalResult);
    setShowPostalCodeSelector(false);
    setPendingResult(null);
  };

  const finalizeSelection = (result: CitySearchResult) => {
    setInputValue(result.city);
    onSelect(result);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    onChange?.(newValue);
  };

  const defaultPlaceholder = t('app:newLaundry.citySearchPlaceholder', 'Rechercher une ville...');

  // Fallback mode - simple text input
  if (fallbackMode) {
    return (
      <div className={cn("relative", className)}>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder || defaultPlaceholder}
            className={cn("pl-10", hasError && "border-destructive focus-visible:ring-destructive")}
            disabled={disabled}
          />
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('app:newLaundry.manualInputMode', 'Mode saisie manuelle (service indisponible)')}
        </p>
      </div>
    );
  }

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
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* City suggestions dropdown */}
      {isOpen && results.length > 0 && !showPostalCodeSelector && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((result, index) => (
            <button
              key={`${result.city}-${result.postalCode}-${index}`}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
            >
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium truncate flex items-center gap-1">
                  {result.city}
                  {result.postalCodes && result.postalCodes.length > 1 && (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {result.postalCodes && result.postalCodes.length > 1 
                    ? `${result.postalCodes.length} codes postaux - Dép. ${result.departmentCode}`
                    : result.context
                  }
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Postal code selector for cities with multiple codes */}
      {showPostalCodeSelector && pendingResult?.postalCodes && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="px-3 py-2 border-b bg-muted/50">
            <p className="text-sm font-medium">{pendingResult.city}</p>
            <p className="text-xs text-muted-foreground">
              {t('app:newLaundry.selectPostalCode', 'Sélectionnez le code postal')}
            </p>
          </div>
          {pendingResult.postalCodes.map((postalCode) => (
            <button
              key={postalCode}
              type="button"
              onClick={() => handlePostalCodeSelect(postalCode)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span className="font-mono">{postalCode}</span>
              <span className="text-muted-foreground ml-2">
                (Dép. {deriveDepartmentCode(postalCode)})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && inputValue.length >= 2 && !isLoading && results.length === 0 && !apiError && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
          {t('app:newLaundry.noCityFound', 'Aucune ville trouvée')}
        </div>
      )}

      {/* API error message */}
      {apiError && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('app:newLaundry.apiUnavailable', 'Service indisponible, saisie manuelle activée')}
        </p>
      )}
    </div>
  );
}
