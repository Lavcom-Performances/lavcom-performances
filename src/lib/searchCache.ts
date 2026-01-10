/**
 * searchCache.ts
 * 
 * Simple in-memory cache with TTL for API search results
 * Used to reduce API calls and improve performance
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SearchCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMinutes: number = 10, maxEntries: number = 200) {
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.maxEntries = maxEntries;
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
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Singleton instance for city search results
// 10 minute TTL, max 200 entries
export const citySearchCache = new SearchCache<any[]>(10, 200);

// Cache key prefixes
export const CACHE_PREFIXES = {
  FRENCH_CITIES: 'fr-cities',
  NOMINATIM_CITIES: 'nominatim',
} as const;
