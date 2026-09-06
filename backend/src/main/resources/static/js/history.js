/**
 * STREAMFLIX - Watch History & Continue Watching Tracker
 * Records playback progress, duration, timestamp, and supports resuming.
 */

const HistoryService = {
  /**
   * Get all history items sorted newest first
   */
  getHistory() {
    const list = StorageManager.getItem(StorageManager.KEYS.HISTORY, []);
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  },

  /**
   * Get playback progress for a specific title
   */
  getProgress(imdbId) {
    if (!imdbId) return null;
    const progressMap = StorageManager.getItem(StorageManager.KEYS.PROGRESS, {});
    return progressMap[imdbId] || null;
  },

  /**
   * Update playback progress and history entry
   */
  updateProgress(movie, currentTime, duration) {
    if (!movie || !movie.imdbID || !duration || duration <= 0) return;

    const percentage = Math.min(100, Math.round((currentTime / duration) * 100));

    // 1. Update progress map
    const progressMap = StorageManager.getItem(StorageManager.KEYS.PROGRESS, {});
    progressMap[movie.imdbID] = {
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      percentage,
      updatedAt: Date.now()
    };
    StorageManager.setItem(StorageManager.KEYS.PROGRESS, progressMap);

    // 2. Update chronological history list
    let history = StorageManager.getItem(StorageManager.KEYS.HISTORY, []);
    history = history.filter(item => item.imdbID !== movie.imdbID);

    const historyEntry = {
      imdbID: movie.imdbID,
      title: movie.Title || movie.title || 'Untitled',
      poster: movie.Poster || movie.poster || 'N/A',
      year: movie.Year || movie.year || '',
      type: movie.Type || movie.type || 'movie',
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      percentage,
      timestamp: Date.now()
    };

    history.unshift(historyEntry);

    // Limit history to 50 items
    if (history.length > 50) {
      history = history.slice(0, 50);
    }

    StorageManager.setItem(StorageManager.KEYS.HISTORY, history);
  },

  /**
   * Remove single entry from history
   */
  remove(imdbId) {
    if (!imdbId) return;
    let history = StorageManager.getItem(StorageManager.KEYS.HISTORY, []);
    history = history.filter(item => item.imdbID !== imdbId);
    StorageManager.setItem(StorageManager.KEYS.HISTORY, history);

    const progressMap = StorageManager.getItem(StorageManager.KEYS.PROGRESS, {});
    if (progressMap[imdbId]) {
      delete progressMap[imdbId];
      StorageManager.setItem(StorageManager.KEYS.PROGRESS, progressMap);
    }
  },

  /**
   * Clear all history
   */
  clear() {
    StorageManager.setItem(StorageManager.KEYS.HISTORY, []);
    StorageManager.setItem(StorageManager.KEYS.PROGRESS, {});
    Utils.showToast('Watch history cleared');
  },

  /**
   * Get items with incomplete playback for "Continue Watching" row
   */
  getContinueWatching() {
    const history = this.getHistory();
    // Return items that have between 2% and 95% progress
    return history.filter(item => item.percentage >= 2 && item.percentage < 95);
  }
};

window.HistoryService = HistoryService;
