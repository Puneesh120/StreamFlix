/**
 * STREAMFLIX - My List / Watchlist Manager
 * Persists user's saved movies and series in LocalStorage.
 * Stores minimal metadata (imdbID, title, poster, year, type).
 */

const WatchlistService = {
  /**
   * Get all watchlist items
   */
  getList() {
    return StorageManager.getItem(StorageManager.KEYS.WATCHLIST, []);
  },

  /**
   * Check if item is in watchlist
   */
  isInList(imdbId) {
    if (!imdbId) return false;
    const list = this.getList();
    return list.some(item => item.imdbID === imdbId);
  },

  /**
   * Add movie/series to watchlist
   */
  add(movie) {
    if (!movie || !movie.imdbID) return false;
    const list = this.getList();

    if (this.isInList(movie.imdbID)) {
      return false; // Already in list
    }

    const entry = {
      imdbID: movie.imdbID,
      title: movie.Title || movie.title || 'Untitled',
      poster: movie.Poster || movie.poster || 'N/A',
      year: movie.Year || movie.year || '',
      type: movie.Type || movie.type || 'movie',
      imdbRating: movie.imdbRating || 'N/A',
      addedAt: Date.now()
    };

    list.unshift(entry);
    StorageManager.setItem(StorageManager.KEYS.WATCHLIST, list);
    Utils.showToast(`Added "${entry.title}" to My List`);
    return true;
  },

  /**
   * Remove item from watchlist
   */
  remove(imdbId) {
    if (!imdbId) return false;
    let list = this.getList();
    const item = list.find(x => x.imdbID === imdbId);
    list = list.filter(x => x.imdbID !== imdbId);
    StorageManager.setItem(StorageManager.KEYS.WATCHLIST, list);

    if (item) {
      Utils.showToast(`Removed "${item.title}" from My List`);
    }
    return true;
  },

  /**
   * Toggle item in watchlist
   */
  toggle(movie) {
    if (!movie || !movie.imdbID) return false;
    if (this.isInList(movie.imdbID)) {
      this.remove(movie.imdbID);
      return false;
    } else {
      this.add(movie);
      return true;
    }
  },

  /**
   * Clear entire watchlist
   */
  clear() {
    StorageManager.setItem(StorageManager.KEYS.WATCHLIST, []);
    Utils.showToast('My List cleared');
  }
};

window.WatchlistService = WatchlistService;
