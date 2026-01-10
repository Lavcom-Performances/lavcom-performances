/**
 * searchCache.ts
 * 
 * Cache with TTL and localStorage persistence for API search results
 * Used to reduce API calls and improve performance
 */

const STORAGE_KEY = 'city_search_cache';
const STORAGE_VERSION = 1;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface StorageData<T> {
  version: number;
  entries: Record<string, CacheEntry<T>>;
}

class SearchCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly storageKey: string;
  private readonly persistToStorage: boolean;

  constructor(
    ttlMinutes: number = 10, 
    maxEntries: number = 200,
    storageKey: string = '',
    persistToStorage: boolean = false
  ) {
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.maxEntries = maxEntries;
    this.storageKey = storageKey;
    this.persistToStorage = persistToStorage && !!storageKey;

    // Load from localStorage on initialization
    if (this.persistToStorage) {
      this.loadFromStorage();
    }
  }

  private generateKey(prefix: string, query: string, ...args: string[]): string {
    return `${prefix}:${query.toLowerCase().trim()}:${args.join(':')}`;
  }

  get(prefix: string, query: string, ...args: string[]): T | null {
    const key = this.generateKey(prefix, query, ...args);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return entry.data;
  }

  set(prefix: string, query: string, data: T, ...args: string[]): void {
    // Cleanup if we're at capacity
    if (this.cache.size >= this.maxEntries) {
      this.cleanup();
    }

    const key = this.generateKey(prefix, query, ...args);
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });

    this.saveToStorage();
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // First pass: remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    // If still over capacity, remove oldest entries (by key order)
    if (this.cache.size >= this.maxEntries) {
      const entriesToRemove = Math.floor(this.maxEntries * 0.2); // Remove 20%
      const iterator = this.cache.keys();
      for (let i = 0; i < entriesToRemove; i++) {
        const key = iterator.next().value;
        if (key) this.cache.delete(key);
      }
    }

    this.saveToStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const data: StorageData<T> = JSON.parse(stored);
      
      // Check version compatibility
      if (data.version !== STORAGE_VERSION) {
        localStorage.removeItem(this.storageKey);
        return;
      }

      const now = Date.now();
      
      // Load non-expired entries
      for (const [key, entry] of Object.entries(data.entries)) {
        if (entry.expiresAt > now) {
          this.cache.set(key, entry);
        }
      }
    } catch (error) {
      console.warn('[SearchCache] Error loading from localStorage:', error);
      localStorage.removeItem(this.storageKey);
    }
  }

  private saveToStorage(): void {
    if (!this.persistToStorage || typeof window === 'undefined') return;

    try {
      const entries: Record<string, CacheEntry<T>> = {};
      const now = Date.now();

      // Only save non-expired entries
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt > now) {
          entries[key] = entry;
        }
      }

      const data: StorageData<T> = {
        version: STORAGE_VERSION,
        entries,
      };

      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      // localStorage might be full or unavailable
      console.warn('[SearchCache] Error saving to localStorage:', error);
    }
  }

  clear(): void {
    this.cache.clear();
    if (this.persistToStorage && typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Singleton instance for city search results
// 30 minute TTL, max 200 entries, persisted to localStorage
export const citySearchCache = new SearchCache<any[]>(30, 200, STORAGE_KEY, true);

// Cache key prefixes
export const CACHE_PREFIXES = {
  FRENCH_CITIES: 'fr-cities',
  NOMINATIM_CITIES: 'nominatim',
} as const;
