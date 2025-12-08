import { useState, useEffect, useCallback } from "react";

export interface AddressSearchResult {
  label: string;
  address: string;
  postalCode: string;
  city: string;
  context: string;
}

export function useAddressSearch(query: string, minChars: number = 3) {
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=10&type=housenumber`
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la recherche");
      }

      const data = await response.json();
      
      const formattedResults: AddressSearchResult[] = data.features.map((feature: any) => ({
        label: feature.properties.label,
        address: feature.properties.name,
        postalCode: feature.properties.postcode,
        city: feature.properties.city,
        context: feature.properties.context,
      }));

      setResults(formattedResults);
    } catch (err) {
      setError("Impossible de charger les adresses");
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

  return { results, isLoading, error };
}
