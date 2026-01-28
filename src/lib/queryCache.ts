/**
 * queryCache.ts
 * 
 * Lightweight in-memory cache for dashboard queries with TTL
 * Used to reduce database load and improve perceived performance
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheConfig {
  ttlMs: number;
  maxEntries: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  ttlMs: 2 * 60 * 1000, // 2 minutes TTL
  maxEntries: 100,
};

class QueryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: CacheConfig;
  private invalidationListeners: Set<() => void> = new Set();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a cache key from site ID, date range, and widget identifier
   */
  generateKey(siteId: string, dateRange: { from?: Date; to?: Date } | undefined, widget: string): string {
    const fromStr = dateRange?.from?.toISOString().split('T')[0] || 'none';
    const toStr = dateRange?.to?.toISOString().split('T')[0] || 'none';
    return `${siteId}:${fromStr}:${toStr}:${widget}`;
  }

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T): void {
    // Cleanup if at capacity
    if (this.cache.size >= this.config.maxEntries) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.config.ttlMs,
      createdAt: Date.now(),
    });
  }

  /**
   * Invalidate all cache entries (e.g., after import)
   */
  invalidateAll(): void {
    this.cache.clear();
    // Notify listeners
    this.invalidationListeners.forEach(listener => listener());
  }

  /**
   * Invalidate entries for a specific site
   */
  invalidateSite(siteId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${siteId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    // Notify listeners
    this.invalidationListeners.forEach(listener => listener());
  }

  /**
   * Register a listener for cache invalidation events
   */
  onInvalidate(listener: () => void): () => void {
    this.invalidationListeners.add(listener);
    return () => this.invalidationListeners.delete(listener);
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    // If still over capacity, remove oldest entries
    if (this.cache.size >= this.config.maxEntries) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt);
      
      const entriesToRemove = Math.floor(this.config.maxEntries * 0.2);
      for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; ttlMs: number; maxEntries: number } {
    return {
      size: this.cache.size,
      ttlMs: this.config.ttlMs,
      maxEntries: this.config.maxEntries,
    };
  }
}

// Singleton instance for dashboard queries
export const dashboardCache = new QueryCache();

// Widget identifiers for cache keys
export const CACHE_WIDGETS = {
  DASHBOARD_KPIS: 'dashboard-kpis',
  MONTHLY_REVENUE: 'monthly-revenue',
  DAILY_REVENUE: 'daily-revenue',
  PAYMENT_BREAKDOWN: 'payment-breakdown',
  MACHINE_PERFORMANCE: 'machine-performance',
  RECOMMENDATIONS: 'recommendations',
  BENCHMARKS: 'benchmarks',
  OPERATIONS_PAGE: 'operations-page',
} as const;
