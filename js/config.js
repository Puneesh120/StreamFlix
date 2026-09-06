/**
 * STREAMFLIX - Configuration
 * Smart API Base URL resolution for localhost (same-origin, separate dev port, file://) and live production.
 */

function resolveApiBaseUrl() {
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  const port = window.location.port;

  // 1. If loaded via file:// protocol
  if (protocol === 'file:') {
    return 'http://localhost:8080/api';
  }

  // 2. If running on a local development server on a port other than 8080 (e.g. Live Server 5500, Vite 5173, etc.)
  if ((host === 'localhost' || host === '127.0.0.1') && port && port !== '8080') {
    return `http://${host}:8080/api`;
  }

  // 3. Same-origin deployment (Default for Spring Boot serving static files on localhost:8080 or live production domain)
  return '/api';
}

const API_BASE_URL = resolveApiBaseUrl();

window.STREAMFLIX_CONFIG = {
  API_BASE_URL,
  CACHE_TTL_MINUTES: 30,
  SEARCH_DEBOUNCE_MS: 500,
  REQUEST_TIMEOUT_MS: 12000,
  APP_NAME: 'STREAMFLIX',
  VERSION: '1.0.0'
};
