import { useState, useEffect, useCallback, useRef } from "react";
import { getDepartmentFromPostcode, sleep } from "@/utils/address";

export interface AddressSearchResult {
  label: string;
  address: string;
  postalCode: string;
  city: string;
  context: string;
  countryCode: string;
  countryName: string;
  department?: string;
  // Champs enrichis (optionnels pour ne pas casser les consommateurs existants).
  // FR : renseignés depuis properties.context de la BAN ("75, Paris, Île-de-France").
  // Hors FR : dérivés de Nominatim (county/state_district, state).
  departmentCode?: string;
  departmentName?: string;
  region?: string;
}

const COMPLETION_URL = "https://data.geopf.fr/geocodage/completion/";
const SEARCH_URL = "https://data.geopf.fr/geocodage/search";

/**
 * Hook for searching addresses across multiple countries.
 * - France: Uses data.geopf.fr (new government geocoding API)
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
  const [manualMode, setManualMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>("");

  const searchAddresses = useCallback(async (searchQuery: string, country: string) => {
    // Reset manual mode when user retypes
    setManualMode(false);
    
    if (searchQuery.length < minChars) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let formattedResults: AddressSearchResult[] = [];

      if (country === "FR") {
        // Cancel previous request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        lastQueryRef.current = searchQuery;

        // API BAN officielle : renvoie déjà postalCode, city ET context
        // ("75, Paris, Île-de-France") qui permet d'extraire département + région.
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=8`;

        console.log("[AddressSearch] Fetching FR addresses:", url);

        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          console.error("[AddressSearch] API error:", response.status, response.statusText);
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const features = (data?.features ?? []) as any[];

        console.log("[AddressSearch] API response:", features.length, "results");

        formattedResults = features
          .filter((f: any) => f?.properties?.label)
          .map((f: any) => {
            const p = f.properties;
            const postalCode = String(p.postcode ?? "").trim();
            const city = String(p.city ?? "").trim();
            // context BAN : "75, Paris, Île-de-France"
            const [departmentCode = "", departmentName = "", region = ""] =
              String(p.context ?? "").split(",").map((s: string) => s.trim());
            // address = numéro + rue si dispo, sinon "name" renvoyé par la BAN
            const address = p.housenumber
              ? `${p.housenumber} ${p.name ?? ""}`.trim()
              : String(p.name ?? p.label);

            const result: AddressSearchResult = {
              label: p.label,
              address,
              postalCode,
              city,
              context: postalCode && city ? `${postalCode} ${city}` : "",
              countryCode: "FR",
              countryName: "France",
              departmentCode,
              departmentName,
              region,
            };
            if (postalCode) {
              result.department = getDepartmentFromPostcode(postalCode);
            }
            return result;
          });

        // Only update if this is still the current query
        if (lastQueryRef.current === searchQuery) {
          setResults(formattedResults);
        }
      } else {
        // Nominatim for international addresses
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        
        const apiUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&countrycodes=${country.toLowerCase()}&format=json&limit=10&addressdetails=1`;
        
        console.log("[AddressSearch] Fetching international addresses:", apiUrl);
        
        const response = await fetch(apiUrl, {
          signal: controller.signal,
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
              department: postalCode ? getDepartmentFromPostcode(postalCode) : undefined,
              // Pas de code département officiel hors FR
              departmentCode: "",
              departmentName: addr.county || addr.state_district || "",
              region: addr.state || "",
            };
          });

        setResults(formattedResults);
      }
    } catch (err: any) {
      // Abort is silent
      if (err?.name === "AbortError") return;
      
      console.error("[AddressSearch] Error:", err);
      setManualMode(true);
      setError("Service indisponible - mode saisie manuelle");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [minChars]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    
    if (trimmedQuery.length < minChars) {
      setResults([]);
      setError(null);
      return;
    }

    const debounceTimer = setTimeout(() => {
      searchAddresses(trimmedQuery, countryCode);
    }, 350);

    return () => clearTimeout(debounceTimer);
  }, [query, countryCode, minChars, searchAddresses]);

  return { results, isLoading, error, manualMode };
}

/**
 * Fetch detailed address info from a selected suggestion
 * Uses the search endpoint to get full postcode/city when not available from completion
 */
export async function fetchAddressDetails(fullAddress: string): Promise<{
  address: string;
  postcode: string;
  city: string;
  department: string;
  country: "FR";
} | null> {
  try {
    // Try the geopf search endpoint first
    const url = `${SEARCH_URL}?q=${encodeURIComponent(fullAddress)}&limit=1`;
    let res = await fetch(url);
    
    // Handle rate limiting with backoff
    if (res.status === 429) {
      await sleep(600);
      res = await fetch(url);
    }
    
    if (res.ok) {
      const json = await res.json();
      const feature = json?.features?.[0];
      const props = feature?.properties || {};
      
      const postcode = String(props?.postcode || props?.postCode || props?.postalcode || "").trim();
      const city = String(props?.city || props?.municipality || props?.locality || "").trim();
      const department = getDepartmentFromPostcode(postcode);
      
      if (postcode && city) {
        return {
          address: fullAddress,
          postcode,
          city,
          department,
          country: "FR",
        };
      }
    }
    
    // Fallback to geo.api.gouv.fr which has better structured data
    console.log("[fetchAddressDetails] geopf failed, trying geo.api.gouv.fr...");
    const fallbackUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}&limit=1`;
    const fallbackRes = await fetch(fallbackUrl);
    
    if (fallbackRes.ok) {
      const fallbackJson = await fallbackRes.json();
      const fallbackFeature = fallbackJson?.features?.[0];
      const fallbackProps = fallbackFeature?.properties || {};
      
      const postcode = String(fallbackProps?.postcode || "").trim();
      const city = String(fallbackProps?.city || "").trim();
      const department = getDepartmentFromPostcode(postcode);
      
      // Use the street name from properties if available, otherwise keep original
      let addressLine = fullAddress;
      if (fallbackProps?.name) {
        addressLine = fallbackProps.name;
        if (fallbackProps?.housenumber) {
          addressLine = `${fallbackProps.housenumber} ${fallbackProps.name}`;
        }
      }
      
      return {
        address: addressLine,
        postcode,
        city,
        department,
        country: "FR",
      };
    }
    
    console.error("[fetchAddressDetails] Both APIs failed");
    return null;
  } catch (err) {
    console.error("Failed to fetch address details:", err);
    return null;
  }
}
