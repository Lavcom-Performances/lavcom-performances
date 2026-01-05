import { useState, useEffect, useCallback } from "react";

export interface AddressSearchResult {
  label: string;
  address: string;
  postalCode: string;
  city: string;
  context: string;
  countryCode: string;
  countryName: string;
}

/**
 * Hook for searching addresses across multiple countries.
 * - France: Uses api-adresse.data.gouv.fr (high quality)
 * - Other countries: Uses Nominatim/OpenStreetMap
 */
export function useAddressSearch(
  query: string, 
  minChars: number = 3,
  countryCode: string = "FR"
) {
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAddresses = useCallback(async (searchQuery: string, country: string) => {
    if (searchQuery.length < minChars) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let formattedResults: AddressSearchResult[] = [];

      if (country === "FR") {
        // French government API - high quality for France
        // Use autocomplete endpoint for better results with partial addresses
        const apiUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=10&autocomplete=1`;
        
        console.log("[AddressSearch] Fetching FR addresses:", apiUrl);
        
        const response = await fetch(apiUrl);

        if (!response.ok) {
          console.error("[AddressSearch] API error:", response.status, response.statusText);
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        console.log("[AddressSearch] API response:", data.features?.length || 0, "results");
        
        if (data.features && data.features.length > 0) {
          formattedResults = data.features.map((feature: any) => ({
            label: feature.properties.label,
            address: feature.properties.name,
            postalCode: feature.properties.postcode || "",
            city: feature.properties.city || feature.properties.municipality || "",
            context: feature.properties.context || "",
            countryCode: "FR",
            countryName: "France",
          }));
        }
      } else {
        // Nominatim for international addresses
        const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&countrycodes=${country.toLowerCase()}&format=json&limit=10&addressdetails=1`;
        
        console.log("[AddressSearch] Fetching international addresses:", apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Accept-Language': 'fr,en',
            'User-Agent': 'LavcomPerformances/1.0',
          }
        });

        if (!response.ok) {
          console.error("[AddressSearch] Nominatim error:", response.status, response.statusText);
          throw new Error(`Nominatim error: ${response.status}`);
        }

        const data = await response.json();
        
        console.log("[AddressSearch] Nominatim response:", data.length || 0, "results");
        
        formattedResults = data
          .filter((r: any) => r.address)
          .map((r: any) => {
            const addr = r.address;
            const streetNumber = addr.house_number || "";
            const street = addr.road || addr.pedestrian || addr.street || "";
            const addressLine = [streetNumber, street].filter(Boolean).join(" ");
            const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || "";
            const postalCode = addr.postcode || "";
            const countryName = addr.country || "";
            
            return {
              label: r.display_name,
              address: addressLine || r.display_name.split(",")[0],
              postalCode,
              city,
              context: [postalCode, city, countryName].filter(Boolean).join(", "),
              countryCode: country,
              countryName,
            };
          });
      }

      setResults(formattedResults);
    } catch (err) {
      console.error("[AddressSearch] Error:", err);
      setError("Impossible de charger les adresses");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [minChars]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchAddresses(query, countryCode);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, countryCode, searchAddresses]);

  return { results, isLoading, error };
}
