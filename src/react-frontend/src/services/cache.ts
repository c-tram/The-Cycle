interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  /** Duration in milliseconds before the cache expires */
  expiresIn: number;
}

const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  expiresIn: 5 * 60 * 1000 // 5 minutes by default
};

export class APICache {
  private static cache: Map<string, CacheItem<any>> = new Map();
  
  static set<T>(key: string, data: T, options: Partial<CacheOptions> = {}): void {
    const { expiresIn } = { ...DEFAULT_CACHE_OPTIONS, ...options };
    
    this.cache.set(key, {
      data,
      timestamp: Date.now() + expiresIn
    });
  }
  
  static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if the cache has expired
    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }
  
  static clear(): void {
    this.cache.clear();
  }
  
  static clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp) {
        this.cache.delete(key);
      }
    }
  }
}

// Clean up expired cache items every 5 minutes
setInterval(() => APICache.clearExpired(), 5 * 60 * 1000);
