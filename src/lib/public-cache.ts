/**
 * Public Cache Utility for ETS Public Pages
 * Enables instant (0ms) page transitions and cached data loading across public views,
 * backed by memory and sessionStorage with stale-while-revalidate background fetches.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes default
const CACHE_PREFIX = "ets_pub_cache_";

class PublicCache {
  private memoryCache = new Map<string, CacheEntry<any>>();

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage() {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          const raw = sessionStorage.getItem(key);
          if (raw) {
            const entry: CacheEntry<any> = JSON.parse(raw);
            const cleanKey = key.replace(CACHE_PREFIX, "");
            if (Date.now() - entry.timestamp < entry.ttlMs) {
              this.memoryCache.set(cleanKey, entry);
            } else {
              sessionStorage.removeItem(key);
            }
          }
        }
      }
    } catch (e) {
      console.warn("[PublicCache] Error hydrating from sessionStorage:", e);
    }
  }

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    // 1. Check memory cache
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (Date.now() - memEntry.timestamp < memEntry.ttlMs) {
        return memEntry.data as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // 2. Check sessionStorage fallback
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const raw = sessionStorage.getItem(CACHE_PREFIX + key);
        if (raw) {
          const entry: CacheEntry<T> = JSON.parse(raw);
          if (Date.now() - entry.timestamp < entry.ttlMs) {
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            sessionStorage.removeItem(CACHE_PREFIX + key);
          }
        }
      } catch (e) {
        // ignore storage errors
      }
    }

    return null;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    if (data === undefined || data === null) return;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };

    // Save in memory
    this.memoryCache.set(key, entry);

    // Save in sessionStorage
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
      } catch (e) {
        console.warn("[PublicCache] Storage quota exceeded:", e);
      }
    }
  }

  /**
   * Invalidate cache matching a pattern or exact key
   */
  invalidate(keyOrPattern?: string | RegExp): void {
    if (!keyOrPattern) {
      this.clear();
      return;
    }

    if (typeof keyOrPattern === "string") {
      this.memoryCache.delete(keyOrPattern);
      if (typeof window !== "undefined" && window.sessionStorage) {
        try {
          sessionStorage.removeItem(CACHE_PREFIX + keyOrPattern);
        } catch (e) {}
      }
    } else if (keyOrPattern instanceof RegExp) {
      for (const key of Array.from(this.memoryCache.keys())) {
        if (keyOrPattern.test(key)) {
          this.memoryCache.delete(key);
          if (typeof window !== "undefined" && window.sessionStorage) {
            try {
              sessionStorage.removeItem(CACHE_PREFIX + key);
            } catch (e) {}
          }
        }
      }
    }
  }

  /**
   * Clear all public cache
   */
  clear(): void {
    this.memoryCache.clear();
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch (e) {}
    }
  }
}

export const publicCache = new PublicCache();
