/**
 * STREAMFLIX - Movies Catalog Controller
 * Dedicated movie catalog with genre tabs, featured movie spotlight, and genre rows.
 */

const MoviesController = {
  activeGenre: 'all',

  async init() {
    this.attachGenreTabs();
    await this.loadSpotlight();
    await this.loadMoviesCatalog('all');
  },

  attachGenreTabs() {
    document.querySelectorAll('.genre-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.genre-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const genre = btn.dataset.genre;
        this.activeGenre = genre;
        this.loadMoviesCatalog(genre);
      });
    });
  },

  async loadSpotlight() {
    const spotlightTitle = document.getElementById('spotlightTitle');
    const spotlightPlot = document.getElementById('spotlightPlot');
    const spotlightSection = document.getElementById('moviesSpotlight');
    const spotlightPlayBtn = document.getElementById('spotlightPlayBtn');
    const spotlightInfoBtn = document.getElementById('spotlightInfoBtn');

    if (!spotlightSection) return;

    try {
      const movie = await Api.getMovieDetails('tt0816692'); // Interstellar
      if (movie && movie.Title) {
        spotlightTitle.textContent = movie.Title;
        spotlightPlot.textContent = movie.Plot;
        spotlightSection.style.backgroundImage = `url('${movie.Poster}')`;

        if (spotlightPlayBtn) {
          spotlightPlayBtn.onclick = () => window.location.href = `watch.html?id=${movie.imdbID}`;
        }
        if (spotlightInfoBtn) {
          spotlightInfoBtn.onclick = () => window.location.href = `movie-details.html?id=${movie.imdbID}`;
        }
      }
    } catch (e) {
      console.warn('Could not load movie spotlight:', e);
    }
  },

  async loadMoviesCatalog(genre) {
    const container = document.getElementById('moviesCatalogContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="movies-grid">
        ${Array(12).fill('<div class="skeleton skeleton-card"></div>').join('')}
      </div>
    `;

    try {
      const catToFetch = genre === 'all' ? 'popular' : genre;
      const movies = await Api.getDiscover(catToFetch);
      const filtered = ProfilesService.filterContentForProfile(movies);

      if (filtered && filtered.length > 0) {
        container.innerHTML = `
          <div class="movies-grid fade-in">
            ${filtered.map(m => App.createMovieCard(m)).join('')}
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="state-container">
            <h3 class="state-title">No movies found</h3>
            <p class="state-text">Check back soon as more titles are added to this category.</p>
          </div>
        `;
      }
    } catch (e) {
      container.innerHTML = `
        <div class="state-container">
          <h3 class="state-title">Unable to Load Movies</h3>
          <p class="state-text">Error retrieving titles. Please check the backend connection.</p>
        </div>
      `;
    }
  }
};

window.MoviesController = MoviesController;
window.addEventListener('DOMContentLoaded', () => MoviesController.init());
