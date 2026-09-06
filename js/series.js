/**
 * STREAMFLIX - TV Series Controller
 * Displays dedicated series catalog with total season counts and episodes info.
 */

const SeriesController = {
  async init() {
    await this.loadSeriesSpotlight();
    await this.loadSeriesCatalog();
  },

  async loadSeriesSpotlight() {
    const titleEl = document.getElementById('seriesSpotlightTitle');
    const plotEl = document.getElementById('seriesSpotlightPlot');
    const heroEl = document.getElementById('seriesSpotlight');
    const playBtn = document.getElementById('seriesPlayBtn');
    const infoBtn = document.getElementById('seriesInfoBtn');

    if (!heroEl) return;

    try {
      const series = await Api.getSeriesDetails('tt0903747'); // Breaking Bad
      if (series && series.Title) {
        titleEl.textContent = series.Title;
        plotEl.textContent = series.Plot;
        heroEl.style.backgroundImage = `url('${series.Poster}')`;

        if (playBtn) {
          playBtn.onclick = () => window.location.href = `watch.html?id=${series.imdbID}`;
        }
        if (infoBtn) {
          infoBtn.onclick = () => window.location.href = `series-details.html?id=${series.imdbID}`;
        }
      }
    } catch (e) {
      console.warn('Could not load series spotlight:', e);
    }
  },

  async loadSeriesCatalog() {
    const container = document.getElementById('seriesCatalogContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="movies-grid">
        ${Array(10).fill('<div class="skeleton skeleton-card"></div>').join('')}
      </div>
    `;

    try {
      const seriesList = await Api.getDiscover('series');
      const filtered = ProfilesService.filterContentForProfile(seriesList);

      if (filtered && filtered.length > 0) {
        container.innerHTML = `
          <div class="movies-grid fade-in">
            ${filtered.map(s => App.createMovieCard(s)).join('')}
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="state-container">
            <h3 class="state-title">No TV Series Found</h3>
            <p class="state-text">Check back soon for new season premieres.</p>
          </div>
        `;
      }
    } catch (e) {
      container.innerHTML = `
        <div class="state-container">
          <h3 class="state-title">Unable to Load TV Series</h3>
          <p class="state-text">Please verify backend server connectivity.</p>
        </div>
      `;
    }
  }
};

window.SeriesController = SeriesController;
window.addEventListener('DOMContentLoaded', () => SeriesController.init());
