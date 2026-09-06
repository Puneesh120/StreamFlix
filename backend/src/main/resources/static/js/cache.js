/**
 * STREAMFLIX - Frontend Cache Manager
 * In-browser 30-minute caching for API calls to prevent redundant requests.
 */

const CacheManager = {
  DEFAULT_TTL_MS: 30 * 60 * 1000, // 30 minutes

  /**
   * Get cached data by key
   */
  get(key) {
    const allCache = StorageManager.getItem(StorageManager.KEYS.CACHE, {});
    const entry = allCache[key];

    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiry) {
      this.remove(key);
      return null;
    }

    return entry.data;
  },

  /**
   * Put data into cache with TTL
   */
  set(key, data, ttlMs = this.DEFAULT_TTL_MS) {
    const allCache = StorageManager.getItem(StorageManager.KEYS.CACHE, {});
    allCache[key] = {
      data,
      expiry: Date.now() + ttlMs,
      savedAt: Date.now()
    };

    // Clean up expired entries if cache is growing large (> 100 entries)
    const keys = Object.keys(allCache);
    if (keys.length > 100) {
      const now = Date.now();
      for (const k of keys) {
        if (allCache[k].expiry < now) {
          delete allCache[k];
        }
      }
    }

    StorageManager.setItem(StorageManager.KEYS.CACHE, allCache);
  },

  /**
   * Remove single key from cache
   */
  remove(key) {
    const allCache = StorageManager.getItem(StorageManager.KEYS.CACHE, {});
    if (allCache[key]) {
      delete allCache[key];
      StorageManager.setItem(StorageManager.KEYS.CACHE, allCache);
    }
  },

  /**
   * Clear all cache entries
   */
  clear() {
    StorageManager.removeItem(StorageManager.KEYS.CACHE);
  }
};

window.CacheManager = CacheManager;
