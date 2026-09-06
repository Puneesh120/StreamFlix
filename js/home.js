/**
 * STREAMFLIX - Homepage Controller
 * Populates dynamic Hero and Content Rows from OMDb via backend REST API.
 * Features progressive row rendering, graceful fallbacks, and fast parallel loading.
 */

const HomeController = {
  async init() {
    this.renderSkeletonRows();
    this.loadHeroBanner(); // Non-blocking async load
    this.renderContinueWatching();
    this.renderMyListRow();
    await this.loadCategoryRows();
    this.renderRecommendationsRow();
    this.attachSliderControls();
  },

  /**
   * Temporary skeleton loaders for rows while data arrives
   */
  renderSkeletonRows() {
    const container = document.getElementById('rowsContainer');
    if (!container) return;

    let skeletonHtml = '';
    for (let r = 0; r < 3; r++) {
      skeletonHtml += `
        <div class="content-row" id="skeleton-row-${r}">
          <div class="row-header">
            <div class="skeleton skeleton-text title" style="width: 200px;"></div>
          </div>
          <div class="row-slider-wrapper">
            <div class="row-slider">
              ${Array(6).fill('<div class="skeleton skeleton-card"></div>').join('')}
            </div>
          </div>
        </div>
      `;
    }
    container.innerHTML = skeletonHtml;
  },

  /**
   * Load cinematic featured movie into Hero banner from OMDb
   */
  async loadHeroBanner() {
    const heroTitle = document.getElementById('heroTitle');
    const heroPlot = document.getElementById('heroPlot');
    const heroMeta = document.getElementById('heroMeta');
    const heroSection = document.getElementById('heroSection');
    const heroPlayBtn = document.getElementById('heroPlayBtn');
    const heroListBtn = document.getElementById('heroListBtn');
    const heroInfoBtn = document.getElementById('heroInfoBtn');

    if (!heroSection) return;

    // Default hero movie object in case network is delayed
    const defaultHero = {
      Title: "Inception",
      Year: "2010",
      Rated: "PG-13",
      Runtime: "148 min",
      Genre: "Action, Adventure, Sci-Fi",
      Plot: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
      imdbRating: "8.8",
      imdbID: "tt1375666",
      Poster: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg"
    };

    const applyHeroData = (movie) => {
      heroTitle.textContent = movie.Title;
      heroPlot.textContent = movie.Plot && movie.Plot !== 'N/A' ? movie.Plot : 'An extraordinary cinematic experience.';

      heroMeta.innerHTML = `
        <span class="badge-pill imdb">IMDb ${movie.imdbRating || '8.5'}</span>
        <span>${movie.Year}</span>
        <span class="badge-pill">${movie.Rated || 'PG-13'}</span>
        <span>${Utils.formatRuntime(movie.Runtime)}</span>
        <span>${movie.Genre || ''}</span>
      `;

      if (movie.Poster && movie.Poster !== 'N/A') {
        heroSection.style.backgroundImage = `url('${movie.Poster}')`;
      }

      heroPlayBtn.onclick = () => {
        window.location.href = `watch.html?id=${movie.imdbID}`;
      };

      const inList = WatchlistService.isInList(movie.imdbID);
      heroListBtn.innerHTML = inList ? '<span>✓ In My List</span>' : '<span>+ My List</span>';
      heroListBtn.onclick = () => {
        const added = WatchlistService.toggle(movie);
        heroListBtn.innerHTML = added ? '<span>✓ In My List</span>' : '<span>+ My List</span>';
      };

      heroInfoBtn.onclick = () => {
        window.location.href = `movie-details.html?id=${movie.imdbID}`;
      };
    };

    // Apply baseline hero immediately so page looks great instantly
    applyHeroData(defaultHero);

    // Then dynamically fetch a live featured title from backend
    try {
      const liveFeatured = await Api.getMovieDetails('tt0468569'); // The Dark Knight
      if (liveFeatured && liveFeatured.Title) {
        applyHeroData(liveFeatured);
      }
    } catch (e) {
      console.warn('Using baseline featured movie for hero banner:', e.message);
    }
  },

  /**
   * Continue Watching row (if active playback history exists)
   */
  renderContinueWatching() {
    const continueItems = HistoryService.getContinueWatching();
    if (continueItems.length === 0) return;

    const rowHtml = this.buildRowHtml('Continue Watching', continueItems, true);
    const container = document.getElementById('rowsContainer');
    if (container) {
      container.insertAdjacentHTML('afterbegin', rowHtml);
    }
  },

  /**
   * My List row (if items saved)
   */
  renderMyListRow() {
    const list = WatchlistService.getList();
    if (list.length === 0) return;

    const rowHtml = this.buildRowHtml('My List', list, false, 'my-list.html');
    const container = document.getElementById('rowsContainer');
    if (container) {
      container.insertAdjacentHTML('beforeend', rowHtml);
    }
  },

  /**
   * Recommended for You row based on user activity
   */
  async renderRecommendationsRow() {
    const topCategories = RecommendationService.getRecommendedCategories();
    if (!topCategories || topCategories.length === 0) return;

    try {
      const categoryToFetch = topCategories[0];
      const movies = await Api.getDiscover(categoryToFetch);
      const filtered = ProfilesService.filterContentForProfile(movies);

      if (filtered && filtered.length > 0) {
        const rowHtml = this.buildRowHtml('Recommended For You', filtered, false);
        const container = document.getElementById('rowsContainer');
        if (container) {
          container.insertAdjacentHTML('afterbegin', rowHtml);
        }
      }
    } catch (e) {
      console.warn('Could not load recommendations:', e);
    }
  },

  /**
   * Progressive parallel loading of core category rows
   */
  async loadCategoryRows() {
    const container = document.getElementById('rowsContainer');
    if (!container) return;

    const categories = [
      { key: 'popular', title: 'Trending Now' },
      { key: 'top_rated', title: 'Top Rated on StreamFlix' },
      { key: 'action', title: 'Action & Adventure' },
      { key: 'scifi', title: 'Sci-Fi & Cyberpunk' },
      { key: 'comedy', title: 'Critically Acclaimed Comedies' },
      { key: 'drama', title: 'Engrossing Dramas' },
      { key: 'thriller', title: 'Edge-of-Your-Seat Thrillers' },
      { key: 'horror', title: 'Horror & Paranormal' },
      { key: 'animation', title: 'Animation & Anime' },
      { key: 'indian', title: 'Indian Cinema Blockbusters' },
      { key: 'series', title: 'Binge-Worthy TV Series' }
    ];

    let hasRenderedFirstRow = false;

    // Load each row progressively so the user sees results immediately
    for (const cat of categories) {
      try {
        const movies = await Api.getDiscover(cat.key);
        const filtered = ProfilesService.filterContentForProfile(movies);

        if (filtered && filtered.length > 0) {
          if (!hasRenderedFirstRow) {
            // Remove the initial skeleton rows once the first real row arrives
            container.querySelectorAll('[id^="skeleton-row-"]').forEach(el => el.remove());
            hasRenderedFirstRow = true;
          }
          const rowHtml = this.buildRowHtml(cat.title, filtered, false, `movies.html?category=${cat.key}`);
          container.insertAdjacentHTML('beforeend', rowHtml);
        }
      } catch (err) {
        console.warn(`Failed loading category ${cat.key}:`, err.message);
      }
    }

    // If all backend calls failed, show friendly connection notice
    if (!hasRenderedFirstRow) {
      container.innerHTML = `
        <div class="state-container">
          <div class="state-icon">📡</div>
          <h2 class="state-title">Connecting to StreamFlix Server...</h2>
          <p class="state-text">If this message persists, ensure the Java Spring Boot backend is running on <code>http://localhost:8080/</code>.</p>
          <a href="/api/health" target="_blank" class="btn btn-secondary">Check Server Status</a>
        </div>
      `;
    }
  },

  /**
   * Construct HTML for a single content row
   */
  buildRowHtml(title, items, showProgress = false, link = '#') {
    const cardsHtml = items.map(m => App.createMovieCard(m, showProgress)).join('');

    return `
      <section class="content-row fade-in">
        <div class="row-header">
          <a href="${link}" class="row-title">
            <span>${Utils.sanitizeHtml(title)}</span>
            <span class="row-link-arrow">Explore All &gt;</span>
          </a>
        </div>
        <div class="row-slider-wrapper">
          <button class="slider-arrow left" aria-label="Previous" onclick="HomeController.slide(this, -1)">&#10094;</button>
          <div class="row-slider">
            ${cardsHtml}
          </div>
          <button class="slider-arrow right" aria-label="Next" onclick="HomeController.slide(this, 1)">&#10095;</button>
        </div>
      </section>
    `;
  },

  /**
   * Slide row left or right
   */
  slide(arrowBtn, direction) {
    const wrapper = arrowBtn.closest('.row-slider-wrapper');
    const slider = wrapper.querySelector('.row-slider');
    const scrollAmount = slider.clientWidth * 0.75 * direction;
    slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  },

  attachSliderControls() {}
};

window.HomeController = HomeController;
window.addEventListener('DOMContentLoaded', () => HomeController.init());
