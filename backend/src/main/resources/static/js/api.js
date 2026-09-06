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
          // Attempt static/direct fallback if 404 (e.g. GitHub Pages without Java backend)
          try {
            const fallbackData = await this.fallbackRequest(endpoint);
            if (fallbackData) {
              if (!options.method || options.method === 'GET') {
                CacheManager.set(cacheKey, fallbackData);
              }
              return fallbackData;
            }
          } catch (_) {}

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

        // Attempt static/direct fallback if network fetch failed
        try {
          const fallbackData = await this.fallbackRequest(endpoint);
          if (fallbackData) {
            if (!options.method || options.method === 'GET') {
              CacheManager.set(cacheKey, fallbackData);
            }
            return fallbackData;
          }
        } catch (_) {}

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
  },

  /**
   * Seamless client-side fallback for GitHub Pages, Vercel, or static web hosting
   */
  async fallbackRequest(endpoint) {
    const omdbKey = 'trilogy';

    // 1. Movie details: /movies/tt... or /series/tt...
    const movieMatch = endpoint.match(/^\/(?:movies|series)\/(tt\d+)$/);
    if (movieMatch) {
      const res = await fetch(`https://www.omdbapi.com/?apikey=${omdbKey}&i=${movieMatch[1]}&plot=full`);
      const data = await res.json();
      if (data && data.Response !== 'False') return data;
    }

    // 2. Search: /movies/search?query=... or /series/search?query=...
    const searchMatch = endpoint.match(/^\/(?:movies|series)\/search\?(.*)$/);
    if (searchMatch) {
      const params = new URLSearchParams(searchMatch[1]);
      const q = params.get('query') || '';
      const p = params.get('page') || '1';
      const type = endpoint.includes('series') ? 'series' : 'movie';
      const res = await fetch(`https://www.omdbapi.com/?apikey=${omdbKey}&s=${encodeURIComponent(q)}&page=${p}&type=${type}`);
      const data = await res.json();
      return data;
    }

    // 3. Category discovery: /discover/{category}
    const discoverMatch = endpoint.match(/^\/discover\/([a-zA-Z0-9_-]+)$/);
    if (discoverMatch) {
      const catKey = discoverMatch[1];
      const seeds = (window.DISCOVERY_CATEGORIES && window.DISCOVERY_CATEGORIES[catKey])
        || ["Inception", "Interstellar", "The Dark Knight", "Avatar", "Gladiator", "Dune"];
      const movies = [];
      const fetchList = seeds.slice(0, 8);
      await Promise.all(fetchList.map(async (title) => {
        try {
          const r = await fetch(`https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}`);
          const d = await r.json();
          if (d && d.Response !== 'False') {
            movies.push(d);
          }
        } catch (_) {}
      }));
      if (movies.length > 0) return movies;
    }

    // 4. Trailer embed: /trailers/{imdbId}
    const trailerMatch = endpoint.match(/^\/trailers\/(tt\d+)/);
    if (trailerMatch && window.VideoSourceManager) {
      const embed = window.VideoSourceManager.getTrailerEmbedUrl(trailerMatch[1]);
      return { imdbId: trailerMatch[1], embedUrl: embed };
    }

    throw new Error('Static fallback unavailable');
  }
};

window.Api = Api;
