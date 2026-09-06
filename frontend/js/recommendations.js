/**
 * STREAMFLIX - Recommendation Engine & User Feedback (Ratings, Likes)
 * Heuristically scores genres based on watch history, ratings, likes, and watchlist.
 * Prioritizes corresponding discovery catalogs without generating fake titles.
 */

const RecommendationService = {
  /**
   * Get user rating for an IMDb ID (1 to 5 stars)
   */
  getUserRating(imdbId) {
    if (!imdbId) return 0;
    const ratings = StorageManager.getItem(StorageManager.KEYS.RATINGS, {});
    return ratings[imdbId] || 0;
  },

  /**
   * Set user rating (1 to 5 stars)
   */
  setUserRating(imdbId, rating) {
    if (!imdbId) return;
    const ratings = StorageManager.getItem(StorageManager.KEYS.RATINGS, {});
    ratings[imdbId] = Math.max(1, Math.min(5, Math.round(rating)));
    StorageManager.setItem(StorageManager.KEYS.RATINGS, ratings);
    Utils.showToast(`Rated ${ratings[imdbId]} / 5 stars`);
  },

  /**
   * Get user like/dislike status ('like' | 'dislike' | null)
   */
  getLikeStatus(imdbId) {
    if (!imdbId) return null;
    const likes = StorageManager.getItem(StorageManager.KEYS.LIKES, {});
    return likes[imdbId] || null;
  },

  /**
   * Toggle like or dislike
   */
  toggleLike(imdbId, type = 'like') {
    if (!imdbId) return null;
    const likes = StorageManager.getItem(StorageManager.KEYS.LIKES, {});
    const current = likes[imdbId];

    if (current === type) {
      delete likes[imdbId]; // Remove
      StorageManager.setItem(StorageManager.KEYS.LIKES, likes);
      return null;
    } else {
      likes[imdbId] = type;
      StorageManager.setItem(StorageManager.KEYS.LIKES, likes);
      Utils.showToast(type === 'like' ? 'Added to Liked titles' : 'Disliked title');
      return type;
    }
  },

  /**
   * Compute top user preferences and return recommended category seed names
   */
  getRecommendedCategories() {
    const genreScores = {};

    const bumpGenre = (genreStr, weight = 1) => {
      if (!genreStr || genreStr === 'N/A') return;
      const parts = genreStr.split(',').map(s => s.trim().toLowerCase());
      parts.forEach(g => {
        genreScores[g] = (genreScores[g] || 0) + weight;
      });
    };

    // 1. Analyze Watchlist (weight 2)
    const watchlist = WatchlistService.getList();
    watchlist.forEach(item => {
      if (item.genre) bumpGenre(item.genre, 2);
    });

    // 2. Analyze History (weight 1.5)
    const history = HistoryService.getHistory();
    history.forEach(item => {
      if (item.genre) bumpGenre(item.genre, 1.5);
    });

    // Map common genre strings to discovery catalog keys
    const genreToCategory = {
      'sci-fi': 'scifi',
      'science fiction': 'scifi',
      'action': 'action',
      'adventure': 'adventure',
      'comedy': 'comedy',
      'drama': 'drama',
      'horror': 'horror',
      'romance': 'romance',
      'thriller': 'thriller',
      'mystery': 'thriller',
      'animation': 'animation',
      'crime': 'crime'
    };

    // Sort by highest score
    const sorted = Object.entries(genreScores)
      .sort((a, b) => b[1] - a[1])
      .map(entry => genreToCategory[entry[0]])
      .filter(Boolean);

    // Remove duplicates
    const unique = Array.from(new Set(sorted));

    // Fallbacks if user hasn't interacted enough yet
    if (unique.length < 3) {
      const defaults = ['scifi', 'action', 'thriller', 'comedy', 'drama'];
      defaults.forEach(d => {
        if (!unique.includes(d)) unique.push(d);
      });
    }

    return unique.slice(0, 4);
  }
};

window.RecommendationService = RecommendationService;
