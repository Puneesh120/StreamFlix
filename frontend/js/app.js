/**
 * STREAMFLIX - Global Application Logic
 * Shared header, mobile menu, active profile indicator, global shortcuts.
 */

const App = {
  init() {
    this.initNavbarScroll();
    this.initMobileMenu();
    this.initProfileDropdown();
    this.updateActiveProfileUI();
    this.initGlobalSearchKey();
  },

  /**
   * Transparent header at top, blurred dark background on scroll
   */
  initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const onScroll = () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  },

  /**
   * Mobile slide-in navigation drawer
   */
  initMobileMenu() {
    const btn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (!btn || !navLinks) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !btn.contains(e.target)) {
        navLinks.classList.remove('open');
      }
    });
  },

  /**
   * Profile dropdown toggle
   */
  initProfileDropdown() {
    const avatarBtn = document.querySelector('.profile-avatar-btn');
    const dropdown = document.querySelector('.profile-dropdown');
    if (!avatarBtn || !dropdown) return;

    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });
  },

  /**
   * Reflect active profile name, kids mode indicator, and avatar
   */
  updateActiveProfileUI() {
    const profile = ProfilesService.getActiveProfile();
    const avatarImg = document.querySelector('.profile-avatar-img');
    const profileNameEl = document.querySelector('.profile-dropdown-name');
    const kidsBadge = document.querySelector('.nav-kids-badge');

    if (profile) {
      if (profileNameEl) profileNameEl.textContent = profile.name;
      if (avatarImg) {
        avatarImg.style.backgroundColor = profile.avatarColor || '#E50914';
      }
      if (kidsBadge) {
        kidsBadge.classList.toggle('active', !!profile.isKids);
        kidsBadge.textContent = profile.isKids ? 'KIDS ACTIVE' : 'KIDS';
        kidsBadge.onclick = () => {
          // Quick toggle to kids profile
          const target = profile.isKids ? 'p1' : 'pkids';
          ProfilesService.setActiveProfile(target);
          window.location.reload();
        };
      }
    }
  },

  /**
   * Quick shortcut '/' to jump to search
   */
  initGlobalSearchKey() {
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        window.location.href = 'search.html';
      }
    });
  },

  /**
   * Render horizontal movie card HTML
   */
  createMovieCard(movie, showProgress = false) {
    if (!movie || !movie.imdbID) return '';

    const imdbId = movie.imdbID;
    const title = Utils.sanitizeHtml(movie.Title || movie.title || 'Untitled');
    const year = movie.Year || movie.year || '';
    const rating = movie.imdbRating && movie.imdbRating !== 'N/A' ? `⭐ ${movie.imdbRating}` : '';
    const posterSrc = (movie.Poster && movie.Poster !== 'N/A') ? movie.Poster : Utils.getPlaceholderPoster(title);

    const isInList = WatchlistService.isInList(imdbId);
    const inListIcon = isInList ? '✓' : '+';

    let progressHtml = '';
    if (showProgress) {
      const progress = HistoryService.getProgress(imdbId);
      if (progress && progress.percentage) {
        progressHtml = `
          <div class="card-progress-bar">
            <div class="card-progress-fill" style="width: ${progress.percentage}%;"></div>
          </div>
        `;
      }
    }

    return `
      <div class="movie-card" data-id="${imdbId}" onclick="window.location.href='movie-details.html?id=${imdbId}'">
        <img class="card-poster" src="${posterSrc}" alt="${title}" loading="lazy" onerror="Utils.handleImageError(this, '${title.replace(/'/g, "\\'")}')" />
        <div class="card-overlay">
          <div class="card-title">${title}</div>
          <div class="card-info-row">
            <span>${year}</span>
            <span class="card-rating">${rating}</span>
          </div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="card-btn btn-play-mini" title="Play" onclick="window.location.href='watch.html?id=${imdbId}'">▶</button>
            <button class="card-btn" title="${isInList ? 'Remove from My List' : 'Add to My List'}" onclick="App.handleCardWatchlistClick(this, '${imdbId}')">${inListIcon}</button>
            <button class="card-btn" title="More Info" onclick="App.openQuickModal('${imdbId}')">ⓘ</button>
          </div>
        </div>
        ${progressHtml}
      </div>
    `;
  },

  /**
   * Handle card watchlist click
   */
  handleCardWatchlistClick(btn, imdbId) {
    const movieObj = { imdbID: imdbId };
    const added = WatchlistService.toggle(movieObj);
    btn.textContent = added ? '✓' : '+';
    btn.title = added ? 'Remove from My List' : 'Add to My List';
  },

  /**
   * Quick preview modal
   */
  async openQuickModal(imdbId) {
    let modal = document.getElementById('quickModal');
    if (!modal) return;

    const modalHero = modal.querySelector('.modal-hero');
    const modalTitle = modal.querySelector('.modal-title');
    const modalMeta = modal.querySelector('.modal-meta');
    const modalPlot = modal.querySelector('.modal-plot');
    const modalPlayBtn = modal.querySelector('.modal-play-btn');
    const modalListBtn = modal.querySelector('.modal-list-btn');

    modalTitle.textContent = 'Loading details...';
    modalPlot.textContent = '';
    modalMeta.innerHTML = '';
    modal.classList.add('open');

    try {
      const movie = await Api.getMovieDetails(imdbId);
      modalTitle.textContent = movie.Title;
      modalPlot.textContent = movie.Plot;

      const poster = (movie.Poster && movie.Poster !== 'N/A') ? movie.Poster : Utils.getPlaceholderPoster(movie.Title);
      modalHero.style.backgroundImage = `url('${poster}')`;

      modalMeta.innerHTML = `
        <span>⭐ ${movie.imdbRating || 'N/A'}</span>
        <span>•</span>
        <span>${movie.Year}</span>
        <span>•</span>
        <span>${movie.Rated || 'NR'}</span>
        <span>•</span>
        <span>${movie.Runtime || ''}</span>
      `;

      modalPlayBtn.onclick = () => {
        window.location.href = `watch.html?id=${movie.imdbID}`;
      };

      const inList = WatchlistService.isInList(movie.imdbID);
      modalListBtn.textContent = inList ? '✓ In My List' : '+ My List';
      modalListBtn.onclick = () => {
        const added = WatchlistService.toggle(movie);
        modalListBtn.textContent = added ? '✓ In My List' : '+ My List';
      };
    } catch (e) {
      modalTitle.textContent = 'Unable to load details';
      modalPlot.textContent = 'Please try again later.';
    }
  },

  closeQuickModal() {
    const modal = document.getElementById('quickModal');
    if (modal) modal.classList.remove('open');
  }
};

window.App = App;
window.addEventListener('DOMContentLoaded', () => App.init());
