/**
 * Frontend Cache Service
 * 
 * Comprehensive caching solution for API responses and application state.
 * Provides memory caching, localStorage persistence, and cache invalidation strategies.
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  key: string;
}

interface CacheStats {
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
  missCount: number;
  hitCount: number;
  oldestEntry: number;
  newestEntry: number;
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private hitCount = 0;
  private missCount = 0;
  private readonly maxMemoryEntries = 1000;
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Store data in cache with optional TTL and tags
   */
  set<T>(key: string, data: T, ttl?: number, tags: string[] = []): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      tags,
      key
    };

    // Memory cache
    this.memoryCache.set(key, entry);
    
    // Clean up memory cache if too large
    if (this.memoryCache.size > this.maxMemoryEntries) {
      this.cleanupMemoryCache();
    }

    // Persistent cache for important data
    if (tags.includes('persistent')) {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('Failed to store in localStorage:', error);
      }
    }

    console.log(`🗄️ Cache: Stored ${key} with TTL ${ttl}ms`);
  }

  /**
   * Retrieve data from cache
   */
  get<T>(key: string): T | null {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    
    if (memoryEntry && this.isValidEntry(memoryEntry)) {
      this.hitCount++;
      console.log(`🎯 Cache hit: ${key}`);
      return memoryEntry.data as T;
    }

    // Check localStorage for persistent cache
    try {
      const persistentData = localStorage.getItem(`cache_${key}`);
      if (persistentData) {
        const entry: CacheEntry<T> = JSON.parse(persistentData);
        
        if (this.isValidEntry(entry)) {
          // Restore to memory cache
          this.memoryCache.set(key, entry);
          this.hitCount++;
          console.log(`🎯 Cache hit (persistent): ${key}`);
          return entry.data;
        } else {
          // Clean up expired persistent cache
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
    }

    this.missCount++;
    console.log(`❌ Cache miss: ${key}`);
    return null;
  }

  /**
   * Check if data exists in cache
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }

    if (deleted) {
      console.log(`🗑️ Cache: Deleted ${key}`);
    }

    return deleted;
  }

  /**
   * Clear cache entries by tags
   */
  clearByTags(tags: string[]): number {
    let clearedCount = 0;

    // Clear memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.memoryCache.delete(key);
        clearedCount++;
      }
    }

    // Clear localStorage cache
    try {
      const keys = Object.keys(localStorage);
      for (const storageKey of keys) {
        if (storageKey.startsWith('cache_')) {
          const data = localStorage.getItem(storageKey);
          if (data) {
            const entry: CacheEntry = JSON.parse(data);
            if (tags.some(tag => entry.tags.includes(tag))) {
              localStorage.removeItem(storageKey);
              clearedCount++;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to clear localStorage by tags:', error);
    }

    console.log(`🗑️ Cache: Cleared ${clearedCount} entries with tags:`, tags);
    return clearedCount;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    this.hitCount = 0;
    this.missCount = 0;

    // Clear localStorage cache
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }

    console.log('🗑️ Cache: Cleared all entries');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.memoryCache.values());
    const memoryUsage = this.calculateMemoryUsage();
    
    const timestamps = entries.map(e => e.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      totalEntries: this.memoryCache.size,
      memoryUsage,
      hitRate: Math.round(hitRate * 100) / 100,
      hitCount: this.hitCount,
      missCount: this.missCount,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleanedCount = 0;
    const now = Date.now();

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValidEntry(entry, now)) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean localStorage cache
    try {
      const keys = Object.keys(localStorage);
      for (const storageKey of keys) {
        if (storageKey.startsWith('cache_')) {
          const data = localStorage.getItem(storageKey);
          if (data) {
            try {
              const entry: CacheEntry = JSON.parse(data);
              if (!this.isValidEntry(entry, now)) {
                localStorage.removeItem(storageKey);
                cleanedCount++;
              }
            } catch (error) {
              // Invalid JSON, remove it
              localStorage.removeItem(storageKey);
              cleanedCount++;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup localStorage:', error);
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cache: Cleaned up ${cleanedCount} expired entries`);
    }

    return cleanedCount;
  }

  /**
   * Wrapper for caching API calls
   */
  async remember<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    tags: string[] = []
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch new data
    console.log(`🔄 Cache: Fetching new data for ${key}`);
    try {
      const data = await fetcher();
      this.set(key, data, ttl, tags);
      return data;
    } catch (error) {
      console.error(`Failed to fetch data for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isValidEntry(entry: CacheEntry, now: number = Date.now()): boolean {
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Clean up memory cache when it gets too large
   */
  private cleanupMemoryCache(): void {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const toRemove = entries.slice(0, Math.floor(this.maxMemoryEntries * 0.2));
    
    for (const [key] of toRemove) {
      this.memoryCache.delete(key);
    }

    console.log(`🧹 Cache: Cleaned up ${toRemove.length} old memory entries`);
  }

  /**
   * Calculate approximate memory usage
   */
  private calculateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.memoryCache.values()) {
      totalSize += JSON.stringify(entry).length * 2; // Rough estimate
    }

    return totalSize;
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Auto cleanup every 5 minutes
setInterval(() => {
  cacheService.cleanup();
}, 5 * 60 * 1000);

// Development tools
if (process.env.NODE_ENV === 'development') {
  (window as any).__cacheService = {
    getStats: () => cacheService.getStats(),
    clear: () => cacheService.clear(),
    cleanup: () => cacheService.cleanup(),
    clearByTags: (tags: string[]) => cacheService.clearByTags(tags)
  };

  console.log('🔧 Cache service controls available via window.__cacheService');
}

/**
 * React hook for cached API calls
 */
import { useState, useEffect, useCallback } from 'react';

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    tags?: string[];
    dependencies?: any[];
    enabled?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { 
    ttl = 5 * 60 * 1000, 
    tags = [], 
    dependencies = [], 
    enabled = true 
  } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await cacheService.remember(key, fetcher, ttl, tags);
      setData(result);
    } catch (err) {
      setError(err as Error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [key, ttl, JSON.stringify(tags), enabled, ...dependencies]);

  // Invalidate cache when dependencies change
  useEffect(() => {
    if (dependencies.length > 0) {
      cacheService.delete(key);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    cacheService.delete(key);
    fetchData();
  }, [key, fetchData]);

  const invalidate = useCallback(() => {
    cacheService.delete(key);
    setData(null);
  }, [key]);

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidate,
    isCached: data !== null && !isLoading
  };
}

export default cacheService;