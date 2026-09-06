/**
 * STREAMFLIX - Search Controller
 * Debounced search (500ms), type filters (All/Movies/Series), pagination, and recent searches.
 */

const SearchController = {
  currentPage: 1,
  currentQuery: '',
  currentType: 'all', // 'all', 'movie', 'series'
  totalResults: 0,

  init() {
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.getElementById('searchBtn');
    this.resultsGrid = document.getElementById('searchResultsGrid');
    this.paginationContainer = document.getElementById('paginationContainer');
    this.recentChipsContainer = document.getElementById('recentSearchesChips');
    this.clearRecentBtn = document.getElementById('clearRecentSearchesBtn');

    // Parse URL query parameter if opened via ?q=...
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');

    this.renderRecentSearches();
    this.attachEventListeners();

    if (initialQuery) {
      this.searchInput.value = initialQuery;
      this.performSearch(initialQuery, 1);
    } else {
      this.searchInput.focus();
    }
  },

  attachEventListeners() {
    // 500ms debounced live search
    const debouncedSearch = Utils.debounce((query) => {
      if (query.trim().length >= 2) {
        this.performSearch(query, 1);
      }
    }, 500);

    this.searchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      if (q.trim().length === 0) {
        this.clearResults();
      } else {
        debouncedSearch(q);
      }
    });

    // Enter key triggers immediately
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = this.searchInput.value;
        if (q.trim()) this.performSearch(q, 1);
      }
    });

    if (this.searchBtn) {
      this.searchBtn.onclick = () => {
        const q = this.searchInput.value;
        if (q.trim()) this.performSearch(q, 1);
      };
    }

    // Filter tabs
    document.querySelectorAll('.search-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.search-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentType = tab.dataset.type;
        if (this.currentQuery) {
          this.performSearch(this.currentQuery, 1);
        }
      });
    });

    // Clear recent searches
    if (this.clearRecentBtn) {
      this.clearRecentBtn.onclick = () => {
        StorageManager.removeItem(StorageManager.KEYS.RECENT_SEARCHES);
        this.renderRecentSearches();
      };
    }
  },

  async performSearch(query, page = 1) {
    const trimmed = query.trim();
    if (!trimmed) return;

    this.currentQuery = trimmed;
    this.currentPage = page;

    this.saveRecentSearch(trimmed);
    this.showSkeletons();

    try {
      let response;
      if (this.currentType === 'movie') {
        response = await Api.searchMovies(trimmed, page);
      } else if (this.currentType === 'series') {
        response = await Api.searchSeries(trimmed, page);
      } else {
        // All: query both or standard movie search
        response = await Api.searchMovies(trimmed, page);
      }

      if (response && response.Search && response.Search.length > 0) {
        this.totalResults = parseInt(response.totalResults, 10) || response.Search.length;
        this.renderResults(response.Search);
        this.renderPagination();
      } else {
        this.showNoResults();
      }
    } catch (err) {
      this.showError(err.message || 'Error occurred while searching.');
    }
  },

  renderResults(movies) {
    const filtered = ProfilesService.filterContentForProfile(movies);
    if (!filtered || filtered.length === 0) {
      this.showNoResults();
      return;
    }

    const cardsHtml = filtered.map(m => App.createMovieCard(m)).join('');
    this.resultsGrid.innerHTML = cardsHtml;
  },

  renderPagination() {
    if (!this.paginationContainer) return;

    const totalPages = Math.min(100, Math.ceil(this.totalResults / 10)); // OMDb returns 10 per page
    if (totalPages <= 1) {
      this.paginationContainer.innerHTML = '';
      return;
    }

    let html = `
      <div class="pagination-bar">
        <button class="btn btn-secondary ${this.currentPage <= 1 ? 'disabled' : ''}" 
          ${this.currentPage <= 1 ? 'disabled' : ''} 
          onclick="SearchController.performSearch('${this.currentQuery.replace(/'/g, "\\'")}', ${this.currentPage - 1})">
          &lt; Previous
        </button>
        <span class="pagination-info">Page ${this.currentPage} of ${totalPages} (${this.totalResults} results)</span>
        <button class="btn btn-secondary ${this.currentPage >= totalPages ? 'disabled' : ''}" 
          ${this.currentPage >= totalPages ? 'disabled' : ''} 
          onclick="SearchController.performSearch('${this.currentQuery.replace(/'/g, "\\'")}', ${this.currentPage + 1})">
          Next &gt;
        </button>
      </div>
    `;

    this.paginationContainer.innerHTML = html;
  },

  showSkeletons() {
    let skeletons = '';
    for (let i = 0; i < 10; i++) {
      skeletons += '<div class="skeleton skeleton-card"></div>';
    }
    this.resultsGrid.innerHTML = skeletons;
    if (this.paginationContainer) this.paginationContainer.innerHTML = '';
  },

  showNoResults() {
    this.resultsGrid.innerHTML = `
      <div class="state-container" style="grid-column: 1 / -1;">
        <div class="state-icon">🔍</div>
        <h3 class="state-title">No Results Found</h3>
        <p class="state-text">Your search for "${Utils.sanitizeHtml(this.currentQuery)}" did not match any titles. Try searching for another keyword or actor.</p>
      </div>
    `;
    if (this.paginationContainer) this.paginationContainer.innerHTML = '';
  },

  showError(message) {
    this.resultsGrid.innerHTML = `
      <div class="state-container" style="grid-column: 1 / -1;">
        <div class="state-icon">⚠️</div>
        <h3 class="state-title">Search Error</h3>
        <p class="state-text">${Utils.sanitizeHtml(message)}</p>
      </div>
    `;
    if (this.paginationContainer) this.paginationContainer.innerHTML = '';
  },

  clearResults() {
    this.resultsGrid.innerHTML = '';
    if (this.paginationContainer) this.paginationContainer.innerHTML = '';
  },

  saveRecentSearch(query) {
    let recents = StorageManager.getItem(StorageManager.KEYS.RECENT_SEARCHES, []);
    recents = recents.filter(q => q.toLowerCase() !== query.toLowerCase());
    recents.unshift(query);
    if (recents.length > 8) recents = recents.slice(0, 8);
    StorageManager.setItem(StorageManager.KEYS.RECENT_SEARCHES, recents);
    this.renderRecentSearches();
  },

  renderRecentSearches() {
    if (!this.recentChipsContainer) return;
    const recents = StorageManager.getItem(StorageManager.KEYS.RECENT_SEARCHES, []);
    const wrapper = document.getElementById('recentSearchesSection');

    if (!recents || recents.length === 0) {
      if (wrapper) wrapper.style.display = 'none';
      return;
    }

    if (wrapper) wrapper.style.display = 'block';

    this.recentChipsContainer.innerHTML = recents.map(term => `
      <button class="search-chip" onclick="SearchController.applyRecentSearch('${term.replace(/'/g, "\\'")}')">
        <span>🔍 ${Utils.sanitizeHtml(term)}</span>
      </button>
    `).join('');
  },

  applyRecentSearch(term) {
    this.searchInput.value = term;
    this.performSearch(term, 1);
  }
};

window.SearchController = SearchController;
window.addEventListener('DOMContentLoaded', () => SearchController.init());
