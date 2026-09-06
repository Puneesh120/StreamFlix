/**
 * STREAMFLIX - Utility Helpers
 * Formatting, debouncing, sanitization, placeholder generators, toast alerts.
 */

const Utils = {
  /**
   * Debounce function calls (e.g., search input)
   */
  debounce(func, delay = 500) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * Format runtime minutes string to "Xh Ym"
   * e.g., "148 min" -> "2h 28m"
   */
  formatRuntime(runtimeStr) {
    if (!runtimeStr || runtimeStr === 'N/A') return 'N/A';
    const mins = parseInt(runtimeStr, 10);
    if (isNaN(mins)) return runtimeStr;
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    if (hours === 0) return `${remainder}m`;
    if (remainder === 0) return `${hours}h`;
    return `${hours}h ${remainder}m`;
  },

  /**
   * Format IMDb votes string to compact notation
   * e.g. "2,481,200" -> "2.5M"
   */
  formatVotes(votesStr) {
    if (!votesStr || votesStr === 'N/A') return '';
    const num = parseInt(votesStr.replace(/,/g, ''), 10);
    if (isNaN(num)) return votesStr;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  },

  /**
   * Sanitize text content to prevent XSS
   */
  sanitizeHtml(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  },

  /**
   * Format seconds to mm:ss or hh:mm:ss
   */
  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const mDisplay = m < 10 ? '0' + m : m;
    const sDisplay = s < 10 ? '0' + s : s;

    if (h > 0) {
      const hDisplay = h < 10 ? '0' + h : h;
      return `${hDisplay}:${mDisplay}:${sDisplay}`;
    }
    return `${mDisplay}:${sDisplay}`;
  },

  /**
   * Generate an inline SVG placeholder when poster is "N/A" or image fails
   */
  getPlaceholderPoster(title = 'StreamFlix') {
    const safeTitle = this.sanitizeHtml(title);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
        <rect width="300" height="450" fill="#1b1b1b"/>
        <rect x="15" y="15" width="270" height="420" fill="none" stroke="#333" stroke-width="2"/>
        <circle cx="150" cy="190" r="45" fill="#262626"/>
        <polygon points="142,175 165,190 142,205" fill="#E50914"/>
        <text x="150" y="275" fill="#E50914" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="22" font-weight="bold" text-anchor="middle" letter-spacing="2">STREAMFLIX</text>
        <text x="150" y="310" fill="#888" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="14" text-anchor="middle">${safeTitle.substring(0, 24)}</text>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  },

  /**
   * Handle broken image loads with placeholder
   */
  handleImageError(imgElement, title) {
    if (imgElement && !imgElement.dataset.failed) {
      imgElement.dataset.failed = 'true';
      imgElement.src = this.getPlaceholderPoster(title);
    }
  },

  /**
   * Display toast notification
   */
  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${this.sanitizeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  /**
   * Check if a title is safe for Kids profile
   * Restricts R, NC-17, TV-MA, and explicit rated titles
   */
  isKidsSafe(movie) {
    if (!movie) return false;
    const rated = (movie.Rated || movie.rated || '').toUpperCase().trim();
    const adultRatings = ['R', 'NC-17', 'TV-MA', 'NOT RATED', 'UNRATED', 'X', '18+'];
    if (adultRatings.includes(rated)) {
      return false;
    }
    // Check genres
    const genre = (movie.Genre || movie.genre || '').toLowerCase();
    if (genre.includes('horror') || genre.includes('erotica')) {
      return false;
    }
    return true;
  }
};

window.Utils = Utils;
