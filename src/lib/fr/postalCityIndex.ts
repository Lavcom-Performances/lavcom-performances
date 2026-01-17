/**
 * postalCityIndex.ts
 * 
 * Lazy-loads and caches the French postal code to city index from CSV.
 * Provides lookup functions for city validation against postal codes.
 */

import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';

interface PostalCityEntry {
  city: string;
  department: string;
  insee_code: string;
  city_norm: string;
}

// Module-level singleton cache
let postalCityIndex: Map<string, PostalCityEntry[]> | null = null;
let loadPromise: Promise<void> | null = null;

/**
 * Lazy-load the CSV and build the in-memory index.
 * Call this before using lookup functions (or they will call it automatically).
 */
export async function loadPostalCityIndex(): Promise<void> {
  // Already loaded
  if (postalCityIndex !== null) {
    return;
  }

  // Loading in progress - wait for it
  if (loadPromise !== null) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch('/data/fr_postal_codes_cities.csv');
      
      if (!response.ok) {
        throw new Error(`Failed to load postal codes CSV: ${response.status}`);
      }

      const csvText = await response.text();
      
      const parsed = Papa.parse<{
        postal_code: string;
        city: string;
        department: string;
        insee_code: string;
        city_norm: string;
      }>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        console.warn('[postalCityIndex] CSV parse warnings:', parsed.errors.slice(0, 5));
      }

      // Build the index: Map<postal_code, Array<entry>>
      const index = new Map<string, PostalCityEntry[]>();

      for (const row of parsed.data) {
        if (!row.postal_code || !row.city) continue;

        const cp = row.postal_code.padStart(5, '0');
        const entry: PostalCityEntry = {
          city: row.city,
          department: row.department || '',
          insee_code: row.insee_code || '',
          city_norm: row.city_norm || row.city.toLowerCase(),
        };

        const existing = index.get(cp);
        if (existing) {
          existing.push(entry);
        } else {
          index.set(cp, [entry]);
        }
      }

      postalCityIndex = index;
      console.log(`[postalCityIndex] Loaded ${index.size} postal codes with ${parsed.data.length} city entries`);
    } catch (error) {
      console.error('[postalCityIndex] Failed to load postal codes:', error);
      // Set empty map to avoid retry loops, but log the error
      postalCityIndex = new Map();
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Normalize a postal code to 5 digits
 */
function normalizePostalCode(cp: string): string {
  const cleaned = cp.replace(/\D/g, '');
  return cleaned.padStart(5, '0').substring(0, 5);
}

/**
 * Normalize a city name for comparison
 */
function normalizeCityName(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/['-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get all cities for a given postal code.
 * Returns sorted, unique city names.
 */
export function getCitiesForPostalCode(cp: string): string[] {
  if (!postalCityIndex) {
    console.warn('[postalCityIndex] Index not loaded, returning empty array');
    return [];
  }

  const normalized = normalizePostalCode(cp);
  
  if (normalized.length !== 5) {
    return [];
  }

  const entries = postalCityIndex.get(normalized);
  
  if (!entries || entries.length === 0) {
    return [];
  }

  // Return unique, sorted city names
  const uniqueCities = [...new Set(entries.map(e => e.city))];
  return uniqueCities.sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Get the department for a given postal code and city combination.
 * Returns null if not found or invalid.
 */
export function getDepartmentFor(cp: string, city: string): string | null {
  if (!postalCityIndex) {
    return null;
  }

  const normalized = normalizePostalCode(cp);
  const entries = postalCityIndex.get(normalized);

  if (!entries) {
    return null;
  }

  const cityNorm = normalizeCityName(city);
  
  // Find matching entry
  const match = entries.find(e => normalizeCityName(e.city) === cityNorm);
  
  if (match) {
    return match.department;
  }

  // If no exact match, return department from first entry (all same postal code)
  return entries[0]?.department || null;
}

/**
 * Check if a city is valid for a given postal code.
 */
export function isValidCityForPostalCode(cp: string, city: string): boolean {
  if (!postalCityIndex) {
    return false;
  }

  const normalized = normalizePostalCode(cp);
  const entries = postalCityIndex.get(normalized);

  if (!entries || entries.length === 0) {
    return false;
  }

  const cityNorm = normalizeCityName(city);
  
  return entries.some(e => normalizeCityName(e.city) === cityNorm);
}

/**
 * Check if a postal code exists in the index.
 */
export function isValidPostalCode(cp: string): boolean {
  if (!postalCityIndex) {
    return false;
  }

  const normalized = normalizePostalCode(cp);
  return postalCityIndex.has(normalized);
}

/**
 * Get full entry details for a city in a postal code.
 */
export function getCityEntry(cp: string, city: string): PostalCityEntry | null {
  if (!postalCityIndex) {
    return null;
  }

  const normalized = normalizePostalCode(cp);
  const entries = postalCityIndex.get(normalized);

  if (!entries) {
    return null;
  }

  const cityNorm = normalizeCityName(city);
  return entries.find(e => normalizeCityName(e.city) === cityNorm) || null;
}

/**
 * Derive department code from postal code (handles Corsica and DOM-TOM).
 */
export function deriveDepartmentCodeFromPostal(postalCode: string): string {
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
    return postalCode.charAt(2) === "0" || postalCode.charAt(2) === "1" ? "2A" : "2B";
  }
  
  // DOM-TOM
  if (prefix === "97" || prefix === "98") {
    return postalCode.substring(0, 3);
  }
  
  return prefix;
}

/**
 * Log validation failure to system_events (light observability).
 */
export async function logPostalValidationEvent(
  eventType: 'postal_code_not_found' | 'city_validation_failed',
  postalCode: string,
  country: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.rpc('rpc_log_system_event', {
      p_source: 'add_site_form',
      p_severity: 'warn',
      p_message: eventType === 'postal_code_not_found' 
        ? `Postal code not found in France index` 
        : `City validation failed for postal code`,
      p_code: eventType,
      p_env: import.meta.env.DEV ? 'development' : 'production',
      p_meta: {
        postal_code: postalCode,
        country,
        ...details,
      },
    });
  } catch (error) {
    // Silent fail - don't break UX for observability
    console.warn('[postalCityIndex] Failed to log event:', error);
  }
}

/**
 * Check if the index is loaded.
 */
export function isIndexLoaded(): boolean {
  return postalCityIndex !== null && postalCityIndex.size > 0;
}
