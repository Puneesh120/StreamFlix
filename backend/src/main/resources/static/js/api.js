/**
 * STREAMFLIX - API Service Client
 * Communicates with the Spring Boot backend REST API.
 * Never stores or exposes the OMDb API key.
 * Features: Request timeout, in-flight deduplication, caching, structured errors.
 */

const Api = {
  // In-flight request deduplication map
  pendingRequests: new Map(),

  /**
   * Generic fetch wrapper with timeout and error translation
   */
  async request(endpoint, options = {}) {
    const url = `${STREAMFLIX_CONFIG.API_BASE_URL}${endpoint}`;
    const cacheKey = `API:${endpoint}`;

    // 1. Check client cache for GET requests unless bypassCache is true
    if (!options.method || options.method === 'GET') {
      if (!options.bypassCache) {
        const cached = CacheManager.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // 2. Request deduplication for simultaneous GET calls
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STREAMFLIX_CONFIG.REQUEST_TIMEOUT_MS);

    const fetchPromise = (async () => {
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(options.headers || {})
          }
        });

        clearTimeout(timeoutId);

        // Handle HTTP Errors
        if (!response.ok) {
          let errorMessage = 'Unable to load data. Please try again.';
          try {
            const errJson = await response.json();
            if (errJson && errJson.message) {
              errorMessage = errJson.message;
            }
          } catch (_) {
            // Not JSON
          }

          if (response.status === 404) {
            errorMessage = 'The requested title was not found.';
          } else if (response.status === 429) {
            errorMessage = 'Movie service request limit reached. Please try again later.';
          } else if (response.status === 503) {
            errorMessage = 'Movie service is temporarily unavailable.';
          }

          const error = new Error(errorMessage);
          error.status = response.status;
          throw error;
        }

        const data = await response.json();

        // Save successful GET requests to cache
        if (!options.method || options.method === 'GET') {
          CacheManager.set(cacheKey, data);
        }

        return data;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Request timed out while connecting to StreamFlix server.');
        }
        if (err.message && err.message.includes('Failed to fetch')) {
          throw new Error('Unable to connect to StreamFlix server. Please verify the backend is running.');
        }
        throw err;
      } finally {
        if (this.pendingRequests.has(cacheKey)) {
          this.pendingRequests.delete(cacheKey);
        }
      }
    })();

    if (!options.method || options.method === 'GET') {
      this.pendingRequests.set(cacheKey, fetchPromise);
    }

    return fetchPromise;
  },

  /**
   * Health Check
   */
  async checkHealth() {
    return this.request('/health', { bypassCache: true });
  },

  /**
   * Search Movies
   */
  async searchMovies(query, page = 1) {
    const encoded = encodeURIComponent(query.trim());
    return this.request(`/movies/search?query=${encoded}&page=${page}`);
  },

  /**
   * Search TV Series
   */
  async searchSeries(query, page = 1) {
    const encoded = encodeURIComponent(query.trim());
    return this.request(`/series/search?query=${encoded}&page=${page}`);
  },

  /**
   * Get Movie Details by IMDb ID
   */
  async getMovieDetails(imdbId) {
    return this.request(`/movies/${imdbId}`);
  },

  /**
   * Get TV Series Details by IMDb ID
   */
  async getSeriesDetails(imdbId) {
    return this.request(`/series/${imdbId}`);
  },

  /**
   * Discover by category
   */
  async getDiscover(category) {
    return this.request(`/discover/${encodeURIComponent(category.toLowerCase())}`);
  },

  /**
   * Resolve official trailer video ID and embed URL
   */
  async getTrailer(imdbId, title = '', year = '') {
    const qTitle = encodeURIComponent(title || '');
    const qYear = encodeURIComponent(year || '');
    return this.request(`/trailers/${imdbId}?title=${qTitle}&year=${qYear}`);
  }
};

window.Api = Api;
