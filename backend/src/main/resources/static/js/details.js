/**
 * STREAMFLIX - Movie & Series Details Controller
 * Handles detailed metadata display, ratings breakdown, user star ratings, and related titles.
 */

const DetailsController = {
  movie: null,
  imdbId: null,

  async init() {
    this.imdbId = new URLSearchParams(window.location.search).get('id');
    if (!this.imdbId) {
      window.location.href = 'index.html';
      return;
    }

    await this.loadDetails();
    this.initUserRating();
    this.initLikeDislike();
    this.initWatchlistButton();
    await this.loadRelated();
  },

  async loadDetails() {
    try {
      this.movie = await Api.getMovieDetails(this.imdbId);
      if (this.movie.Response === 'False') {
        this.showError(this.movie.Error || 'Movie not found');
        return;
      }

      document.title = `${this.movie.Title} (${this.movie.Year}) - STREAMFLIX`;
      this.renderMetadata(this.movie);
    } catch (e) {
      this.showError('Unable to load movie details. Please check your connection.');
    }
  },

  renderMetadata(m) {
    const poster = (m.Poster && m.Poster !== 'N/A') ? m.Poster : Utils.getPlaceholderPoster(m.Title);

    // Backdrop & Poster
    const backdropEl = document.getElementById('detailsBackdrop');
    if (backdropEl) backdropEl.style.backgroundImage = `url('${poster}')`;

    const posterImg = document.getElementById('detailsPoster');
    if (posterImg) {
      posterImg.src = poster;
      posterImg.onerror = () => Utils.handleImageError(posterImg, m.Title);
    }

    // Title & Badges
    document.getElementById('detailsTitle').textContent = m.Title;
    document.getElementById('detailsYear').textContent = m.Year || '';
    document.getElementById('detailsRated').textContent = m.Rated || 'NR';
    document.getElementById('detailsRuntime').textContent = Utils.formatRuntime(m.Runtime);
    document.getElementById('detailsGenre').textContent = m.Genre || '';

    // Plot
    document.getElementById('detailsPlot').textContent = (m.Plot && m.Plot !== 'N/A') ? m.Plot : 'No synopsis available.';

    // Credits
    document.getElementById('detailsDirector').textContent = m.Director || 'N/A';
    document.getElementById('detailsWriter').textContent = m.Writer || 'N/A';
    document.getElementById('detailsActors').textContent = m.Actors || 'N/A';
    document.getElementById('detailsAwards').textContent = m.Awards || 'N/A';
    document.getElementById('detailsLanguage').textContent = m.Language || 'N/A';
    document.getElementById('detailsCountry').textContent = m.Country || 'N/A';

    // Series specifics
    const seasonsContainer = document.getElementById('detailsSeasonsRow');
    if (seasonsContainer) {
      if (m.totalSeasons && m.totalSeasons !== 'N/A') {
        seasonsContainer.style.display = 'block';
        document.getElementById('detailsTotalSeasons').textContent = `${m.totalSeasons} Season${m.totalSeasons > 1 ? 's' : ''}`;
      } else {
        seasonsContainer.style.display = 'none';
      }
    }

    // Official Ratings Breakdown (OMDb API only - no fake ratings)
    this.renderRatingsBreakdown(m);

    // Play action
    const playBtn = document.getElementById('detailsPlayBtn');
    if (playBtn) {
      const status = VideoSourceManager.getPlaybackStatus(m.imdbID);
      if (status === 'full') {
        playBtn.innerHTML = '▶ Play';
      } else if (status === 'trailer') {
        playBtn.innerHTML = '▶ Watch Trailer';
      } else {
        playBtn.innerHTML = '▶ Preview';
      }
      playBtn.onclick = () => {
        window.location.href = `watch.html?id=${m.imdbID}`;
      };
    }
  },

  renderRatingsBreakdown(m) {
    const container = document.getElementById('ratingsBreakdown');
    if (!container) return;

    let itemsHtml = '';

    // 1. IMDb
    if (m.imdbRating && m.imdbRating !== 'N/A') {
      const votesText = Utils.formatVotes(m.imdbVotes);
      itemsHtml += `
        <div class="rating-item imdb">
          <div class="rating-badge">⭐ IMDb</div>
          <div class="rating-value">${m.imdbRating} <span>/ 10</span></div>
          ${votesText ? `<div class="rating-votes">${votesText} votes</div>` : ''}
        </div>
      `;
    }

    // 2. Metascore
    if (m.Metascore && m.Metascore !== 'N/A') {
      itemsHtml += `
        <div class="rating-item metascore">
          <div class="rating-badge">Metascore</div>
          <div class="rating-value">${m.Metascore} <span>/ 100</span></div>
        </div>
      `;
    }

    // 3. Rotten Tomatoes / Other ratings array from OMDb
    if (m.Ratings && Array.isArray(m.Ratings)) {
      m.Ratings.forEach(r => {
        if (r.Source === 'Rotten Tomatoes') {
          itemsHtml += `
            <div class="rating-item rt">
              <div class="rating-badge">🍅 Rotten Tomatoes</div>
              <div class="rating-value">${r.Value}</div>
            </div>
          `;
        }
      });
    }

    container.innerHTML = itemsHtml || '<div class="rating-item">No external critic scores available.</div>';
  },

  initUserRating() {
    const starContainer = document.getElementById('userStarRating');
    const userRatingText = document.getElementById('userRatingText');
    if (!starContainer) return;

    const currentRating = RecommendationService.getUserRating(this.imdbId);

    const updateStars = (val) => {
      starContainer.querySelectorAll('.star-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', (idx + 1) <= val);
        btn.textContent = (idx + 1) <= val ? '★' : '☆';
      });
      if (userRatingText) {
        userRatingText.textContent = val > 0 ? `Your Rating: ${val} / 5 Stars` : 'Rate this title';
      }
    };

    updateStars(currentRating);

    starContainer.querySelectorAll('.star-btn').forEach((btn, idx) => {
      btn.onclick = () => {
        const starVal = idx + 1;
        RecommendationService.setUserRating(this.imdbId, starVal);
        updateStars(starVal);
      };
    });
  },

  initLikeDislike() {
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    if (!likeBtn || !dislikeBtn) return;

    const updateUI = () => {
      const status = RecommendationService.getLikeStatus(this.imdbId);
      likeBtn.classList.toggle('active', status === 'like');
      dislikeBtn.classList.toggle('active', status === 'dislike');
    };

    updateUI();

    likeBtn.onclick = () => {
      RecommendationService.toggleLike(this.imdbId, 'like');
      updateUI();
    };

    dislikeBtn.onclick = () => {
      RecommendationService.toggleLike(this.imdbId, 'dislike');
      updateUI();
    };
  },

  initWatchlistButton() {
    const listBtn = document.getElementById('detailsListBtn');
    if (!listBtn || !this.movie) return;

    const updateBtn = () => {
      const inList = WatchlistService.isInList(this.imdbId);
      listBtn.textContent = inList ? '✓ In My List' : '+ Add to My List';
      listBtn.classList.toggle('active', inList);
    };

    updateBtn();

    listBtn.onclick = () => {
      WatchlistService.toggle(this.movie);
      updateBtn();
    };
  },

  async loadRelated() {
    const container = document.getElementById('relatedGrid');
    if (!container || !this.movie) return;

    const firstGenre = (this.movie.Genre || '').split(',')[0].trim().toLowerCase();
    const catMap = {
      'action': 'action',
      'sci-fi': 'scifi',
      'comedy': 'comedy',
      'drama': 'drama',
      'horror': 'horror',
      'romance': 'romance',
      'thriller': 'thriller',
      'animation': 'animation'
    };

    const catToFetch = catMap[firstGenre] || 'popular';

    try {
      const list = await Api.getDiscover(catToFetch);
      const filtered = (list || []).filter(item => item.imdbID !== this.imdbId);

      if (filtered.length > 0) {
        container.innerHTML = filtered.slice(0, 6).map(m => App.createMovieCard(m)).join('');
      } else {
        container.innerHTML = '<p class="text-muted">No related titles available.</p>';
      }
    } catch (e) {
      console.warn('Failed loading related titles:', e);
    }
  },

  showError(msg) {
    const content = document.getElementById('detailsContent');
    if (content) {
      content.innerHTML = `
        <div class="state-container">
          <div class="state-icon">⚠️</div>
          <h2 class="state-title">Unable to Load Title</h2>
          <p class="state-text">${Utils.sanitizeHtml(msg)}</p>
          <a href="index.html" class="btn btn-primary">Return to Browse</a>
        </div>
      `;
    }
  }
};

window.DetailsController = DetailsController;
window.addEventListener('DOMContentLoaded', () => DetailsController.init());
