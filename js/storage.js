/**
 * STREAMFLIX - Local Storage Manager
 * Robust and safe local storage helper with namespacing and error resilience.
 */

const STORAGE_KEYS = {
  USER: 'streamflix_user',
  PROFILE: 'streamflix_profile',
  WATCHLIST: 'streamflix_watchlist',
  HISTORY: 'streamflix_history',
  PROGRESS: 'streamflix_progress',
  RATINGS: 'streamflix_ratings',
  LIKES: 'streamflix_likes',
  SETTINGS: 'streamflix_settings',
  CACHE: 'streamflix_cache',
  RECENT_SEARCHES: 'streamflix_recent_searches'
};

const StorageManager = {
  KEYS: STORAGE_KEYS,

  /**
   * Set item into LocalStorage safely
   */
  setItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.warn(`[StorageManager] Failed to save key "${key}":`, e);
      return false;
    }
  },

  /**
   * Get item from LocalStorage safely with default fallback
   */
  getItem(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        return defaultValue;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[StorageManager] Corrupted data for key "${key}", falling back to default:`, e);
      return defaultValue;
    }
  },

  /**
   * Remove single key
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`[StorageManager] Failed to remove key "${key}":`, e);
      return false;
    }
  },

  /**
   * Clear all StreamFlix data
   */
  clearAll() {
    try {
      Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
      return true;
    } catch (e) {
      console.warn('[StorageManager] Failed to clear storage:', e);
      return false;
    }
  }
};

window.StorageManager = StorageManager;
