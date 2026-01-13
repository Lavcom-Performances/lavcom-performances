/**
 * CityAutocomplete.tsx
 * 
 * Autocomplete component for cities:
 * - France: uses api-adresse.data.gouv.fr (communes API)
 * - Other countries: uses OpenStreetMap Nominatim
 * 
 * Features:
 * - Searches cities/communes with autocomplete
 * - Returns city name, postal code, and department/region code
 * - Handles multiple postal codes for large cities (France)
 * - Fallback to manual input on API failure
 * - Local cache with TTL for improved performance
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2, AlertCircle, ChevronDown, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { citySearchCache, CACHE_PREFIXES } from "@/lib/searchCache";

export interface CitySearchResult {
  city: string;
  postalCode: string;
  departmentCode: string;
  context: string;
  postalCodes?: string[]; // For cities with multiple postal codes
  countryCode?: string; // ISO country code
}

interface CityAutocompleteProps {
  value: string;
  postalCode?: string;
  countryCode?: string; // ISO country code (FR, BE, CH, DE, etc.)
  onSelect: (result: CitySearchResult) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
  fallbackMode?: boolean;
  onFallbackModeChange?: (fallback: boolean) => void;
}

// Country codes to country names for Nominatim
const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France',
  BE: 'Belgium',
  CH: 'Switzerland',
  LU: 'Luxembourg',
  DE: 'Germany',
  IT: 'Italy',
  NL: 'Netherlands',
  ES: 'Spain',
  AT: 'Austria',
  PT: 'Portugal',
};

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
  countryCode = 'FR',
  onSelect,
  onChange,
  placeholder,
  className,
  disabled = false,
  hasError = false,
  fallbackMode = false,
  onFallbackModeChange,
}: CityAutocompleteProps) {
  const isFrance = countryCode === 'FR';
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

  // Search cities using French API (with cache)
  const searchFrenchCities = useCallback(async (query: string, signal: AbortSignal): Promise<CitySearchResult[]> => {
    // Check cache first
    const cached = citySearchCache.get(CACHE_PREFIXES.FRENCH_CITIES, query);
    if (cached) {
      return cached;
    }

    const response = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,code,codeDepartement,codesPostaux,population&boost=population&limit=10`,
      { signal }
    );

    if (!response.ok) {
      throw new Error("API error");
    }

    const cities = await response.json();

    const results = cities.map((city: any) => {
      const postalCodes: string[] = city.codesPostaux || [];
      const primaryPostalCode = postalCodes[0] || "";
      const deptCode = city.codeDepartement || deriveDepartmentCode(primaryPostalCode);
      
      return {
        city: city.nom,
        postalCode: primaryPostalCode,
        departmentCode: deptCode,
        context: `${primaryPostalCode} - Dép. ${deptCode}`,
        postalCodes: postalCodes.length > 1 ? postalCodes : undefined,
        countryCode: 'FR',
      };
    });

    // Store in cache
    citySearchCache.set(CACHE_PREFIXES.FRENCH_CITIES, query, results);

    return results;
  }, []);

  // Search cities using Nominatim (OpenStreetMap) with cache
  const searchNominatimCities = useCallback(async (query: string, signal: AbortSignal): Promise<CitySearchResult[]> => {
    // Check cache first
    const cached = citySearchCache.get(CACHE_PREFIXES.NOMINATIM_CITIES, query, countryCode);
    if (cached) {
      return cached;
    }

    const countryName = COUNTRY_NAMES[countryCode] || countryCode;
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=${countryCode.toLowerCase()}&addressdetails=1&limit=10&featuretype=city`,
      { 
        signal,
        headers: {
          'Accept-Language': 'fr,en',
          'User-Agent': 'LavcomPerformances/1.0',
        }
      }
    );

    if (!response.ok) {
      throw new Error("Nominatim API error");
    }

    const results = await response.json();

    // Filter to only include place types that represent cities/towns
    const cityTypes = ['city', 'town', 'village', 'municipality', 'hamlet'];
    
    const formattedResults: CitySearchResult[] = results
      .filter((item: any) => {
        const addressType = item.addresstype || item.type;
        return cityTypes.includes(addressType) || item.class === 'place';
      })
      .map((item: any) => {
        const address = item.address || {};
        const cityName = address.city || address.town || address.village || address.municipality || address.hamlet || item.display_name.split(',')[0];
        const postalCode = address.postcode || '';
        const state = address.state || address.province || address.region || '';
        
        // For non-French countries, use state/region as "department"
        let regionCode = '';
        if (address.state_code) {
          regionCode = address.state_code;
        } else if (state) {
          // Take first 2-3 letters as abbreviation
          regionCode = state.substring(0, 3).toUpperCase();
        }
        
        return {
          city: cityName,
          postalCode,
          departmentCode: regionCode,
          context: postalCode ? `${postalCode} - ${state || countryName}` : (state || countryName),
          countryCode: countryCode,
        };
      });

    // Remove duplicates based on city name + postal code
    const seen = new Set<string>();
    const dedupedResults = formattedResults.filter((item: CitySearchResult) => {
      const key = `${item.city}-${item.postalCode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Store in cache
    citySearchCache.set(CACHE_PREFIXES.NOMINATIM_CITIES, query, dedupedResults, countryCode);

    return dedupedResults;
  }, [countryCode]);

  const searchCities = useCallback(async (query: string, retryCount = 0) => {
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
      let formattedResults: CitySearchResult[];
      
      if (isFrance) {
        formattedResults = await searchFrenchCities(query, abortControllerRef.current.signal);
      } else {
        formattedResults = await searchNominatimCities(query, abortControllerRef.current.signal);
      }

      setResults(formattedResults);
      // Reset fallback mode on success if it was previously enabled
      if (onFallbackModeChange && formattedResults.length > 0) {
        onFallbackModeChange(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      console.error("[CityAutocomplete] API error:", err);
      
      // Retry once before enabling fallback mode
      if (retryCount < 1) {
        console.log("[CityAutocomplete] Retrying...");
        setTimeout(() => {
          searchCities(query, retryCount + 1);
        }, 500);
        return;
      }
      
      setApiError(true);
      setResults([]);
      
      // Enable fallback mode only after retry failed
      if (onFallbackModeChange) {
        onFallbackModeChange(true);
      }
    } finally {
      if (retryCount >= 1 || !abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [isFrance, searchFrenchCities, searchNominatimCities, onFallbackModeChange]);

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

  const defaultPlaceholder = isFrance 
    ? t('app:newLaundry.citySearchPlaceholder', 'Rechercher une ville...')
    : t('app:newLaundry.citySearchPlaceholderInternational', 'Search for a city...');

  // Retry search when in fallback mode
  const handleRetrySearch = useCallback(() => {
    if (onFallbackModeChange) {
      onFallbackModeChange(false);
    }
    setApiError(false);
    if (inputValue.length >= 2) {
      searchCities(inputValue, 0);
    }
  }, [onFallbackModeChange, inputValue, searchCities]);

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
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-2">
          <AlertCircle className="h-3 w-3" />
          <span>{t('app:newLaundry.manualInputMode', 'Mode saisie manuelle (service indisponible)')}</span>
          <button 
            type="button" 
            onClick={handleRetrySearch}
            className="text-primary hover:underline font-medium"
          >
            {t('app:newLaundry.retrySearch', 'Réessayer')}
          </button>
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
              {isFrance ? (
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
              ) : (
                <Globe className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium truncate flex items-center gap-1">
                  {result.city}
                  {result.postalCodes && result.postalCodes.length > 1 && (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {result.postalCodes && result.postalCodes.length > 1 
                    ? `${result.postalCodes.length} ${t('app:newLaundry.postalCodes', 'codes postaux')} - ${isFrance ? 'Dép.' : ''} ${result.departmentCode}`
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
