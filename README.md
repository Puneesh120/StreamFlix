# 🎬 STREAMFLIX - Production-Ready Streaming Web Platform

A high-performance, dark-themed, Netflix-inspired streaming web application engineered with a **Java Spring Boot** backend and a pure **Vanilla HTML5 / CSS3 / JavaScript** frontend.

StreamFlix delivers an authentic streaming platform experience—complete with dynamic hero banners, categorized content carousels, responsive movie cards, detailed title dossiers, debounced live search, user star ratings, and an advanced custom HTML5 video player—while securely querying the OMDb API without ever exposing server secrets to the client.

---

## 🌟 Key Features

- **Cinematic Dark UI/UX**: OLED-black styling (`#141414`), Netflix-red accents (`#E50914`), glassmorphism headers, fluid hover scaling, and skeleton shimmer loaders.
- **Dynamic OMDb Metadata Integration**: All ratings, plots, genres, release dates, runtimes, cast, and posters are dynamically retrieved in real time.
- **Single-Domain Production Architecture**: The Spring Boot backend packages and serves the static frontend from `/`, eliminating CORS complications and simplifying cloud hosting into a single executable JAR.
- **Security-First Backend Proxy**: The OMDb API key is stored exclusively on the backend (`OMDB_API_KEY`) and is never leaked to the client browser.
- **Dual-Layer Caching (30 Minutes)**:
  - **Backend Cache**: In-memory `ConcurrentHashMap` with 30-minute TTL to shield against OMDb request limits.
  - **Frontend Cache**: `LocalStorage` cache layer with automatic expiry to prevent redundant network trips.
- **Custom HTML5 Video Player**:
  - Full playback controls, interactive scrubber with buffered progress bar, volume memory, speed picker (`0.5x` to `2x`), picture-in-picture, and fullscreen.
  - Comprehensive keyboard shortcuts: `Space` (Play/Pause), `Left`/`Right` (±10s), `M` (Mute), `F` (Fullscreen), `Esc` (Exit).
  - Playback persistence: Automatically records `currentTime` and resumes playback seamlessly.
  - Legal streaming source compliance: Integrates open-access Creative Commons films (e.g., Blender Open Movie projects: Sintel, Tears of Steel, Big Buck Bunny) and official previews, with graceful notices for unmapped titles.
- **Interactive User Systems**:
  - **My List / Watchlist**: Save titles with one-click toggles stored in LocalStorage.
  - **Watch History**: Chronological log with progress meters and quick resume triggers.
  - **Profiles & Kids Mode**: Switch between Profile 1, Profile 2, and Kids Mode with automatic age-rating filtering (filtering out R, TV-MA, and NC-17 content).
  - **User Ratings & Likes**: Rate titles from 1 to 5 stars ("Your Rating") and toggle Likes/Dislikes without corrupting IMDb metadata.
  - **Recommendation Engine**: Client-side heuristic scoring analyzing watched genres and liked titles to surface tailored rows.
- **Debounced Search**: 500ms debounce on keystrokes, filter tabs (All, Movies, TV Series), pagination controls, and recent search history chips.
- **Fully Responsive**: Seamlessly scales from ultra-compact smartphones (`320px`) through tablets, laptops, desktops, and 4K displays.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Pure HTML5, CSS3, Vanilla JavaScript (ES6+) — *Zero frontend frameworks (No React, Angular, Vue, Next.js, TypeScript, Bootstrap, Tailwind, or jQuery)* |
| **Backend** | Java 21 LTS, Spring Boot 3.3.4, Spring MVC, Jackson Databind, Spring Validation |
| **Build Tool** | Apache Maven 3.9+ |
| **External API** | [OMDb API](https://www.omdbapi.com/) for verified movie and television metadata |
| **Storage** | Browser `LocalStorage` for user state (My List, History, Progress, Ratings, Likes, Cache) |

---

## 📂 Project Structure

```
streamflix/
├── frontend/                                # Standalone frontend source
│   ├── index.html                           # Home page with hero, discovery rows, preview modal
│   ├── movies.html                          # Movies discovery & filter catalog
│   ├── series.html                          # TV series discovery & season badges
│   ├── movie-details.html                   # Rich movie details, ratings, cast, like/dislike, user rating
│   ├── series-details.html                  # TV series details with seasons info
│   ├── watch.html                           # Custom HTML5 streaming player (seek, pip, vtt subtitles)
│   ├── search.html                          # Live debounced search (500ms), filters, pagination
│   ├── my-list.html                         # Saved watchlist grid with quick-actions
│   ├── history.html                         # Chronological watch history with resume playback
│   ├── profiles.html                        # Netflix-style profile selector (Profile 1, 2, Kids)
│   ├── login.html                           # Demo authentication portal
│   ├── settings.html                        # User preferences (autoplay, speed, volume, clear data)
│   ├── 404.html                             # Custom styled 404 error page
│   ├── css/
│   │   ├── style.css                        # Design system: colors, typography, glassmorphism, cards
│   │   ├── responsive.css                   # Responsive breakpoints (320px to 1920px+), touch styles
│   │   ├── animations.css                   # Shimmer skeletons, hover zooms, fade-ins, modal transitions
│   │   └── player.css                       # Video player custom controls, scrubber, overlay
│   ├── js/
│   │   ├── config.js                        # API URL resolution (relative /api in production)
│   │   ├── storage.js                       # Safe LocalStorage wrapper with namespaced keys
│   │   ├── cache.js                         # 30-min frontend client cache
│   │   ├── api.js                           # Fetch client with timeout, deduplication & error handling
│   │   ├── discovery.js                     # Curated discovery seed titles for all categories
│   │   ├── videoSources.js                  # Legal video sources & trailer mapping
│   │   ├── utils.js                         # Debounce, formatting, SVG placeholder, toast notifications
│   │   ├── auth.js                          # Demo auth state manager
│   │   ├── profiles.js                      # Profile switching & Kids Mode content filter
│   │   ├── watchlist.js                     # My List add/remove/toggle operations
│   │   ├── history.js                       # Watch history & playback resume tracker
│   │   ├── recommendations.js               # Client-side heuristic recommendation engine
│   │   ├── player.js                        # HTML5 video player controls, keyboard shortcuts, resume
│   │   ├── details.js                       # Movie/Series details controller
│   │   ├── search.js                        # Search page controller (debounce, pagination, chips)
│   │   ├── movies.js                        # Movies page controller
│   │   ├── series.js                        # Series page controller
│   │   ├── home.js                          # Homepage controller (Hero, dynamic rows, quick modal)
│   │   └── app.js                           # Global app init: navbar scroll, mobile menu, user state
│   └── assets/
│       ├── images/                          # Brand logos, avatars, default fallbacks
│       └── icons/                           # SVG icons
│
├── backend/
│   ├── pom.xml                              # Maven configuration (Java 21, Spring Boot 3.3.4)
│   └── src/
│       ├── main/
│       │   ├── java/com/streamflix/
│       │   │   ├── StreamflixApplication.java
│       │   │   ├── controller/
│       │   │   │   └── MovieController.java
│       │   │   ├── service/
│       │   │   │   └── OmdbService.java
│       │   │   ├── model/
│       │   │   │   ├── Movie.java
│       │   │   │   ├── SearchResponse.java
│       │   │   │   └── ApiError.java
│       │   │   └── config/
│       │   │       └── CorsConfig.java
│       │   └── resources/
│       │       ├── application.properties
│       │       └── static/                  # Production static assets (synced from frontend/)
│       └── test/java/com/streamflix/
│           └── StreamflixApplicationTests.java
│
├── .gitignore
├── .env.example
├── README.md
└── DEPLOYMENT.md
```

---

## 🔑 OMDb API Setup

1. Request a free API key at [https://www.omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx).
2. Validate your email and copy the issued key.
3. Supply this key to the backend via the `OMDB_API_KEY` environment variable.

> [!CAUTION]
> Never write your real API key into any `.html` or `.js` files. The browser must never receive or expose your private key.

---

## 💻 Local Development Setup

### Prerequisites
- **Java**: Java 21 LTS (or 17+)
- **Maven**: Apache Maven 3.9+ (or use the configured Maven distribution)

### Step 1: Set Environment Variable

**Windows (PowerShell):**
```powershell
$env:OMDB_API_KEY = "your_actual_omdb_key"
```

**Windows (Command Prompt):**
```cmd
set OMDB_API_KEY=your_actual_omdb_key
```

**Linux / macOS (Bash / Zsh):**
```bash
export OMDB_API_KEY="your_actual_omdb_key"
```

### Step 2: Build & Run Backend

```bash
cd streamflix/backend
mvn spring-boot:run
```

Once running, access:
- **Application Web UI**: [http://localhost:8080/](http://localhost:8080/)
- **API Health Check**: [http://localhost:8080/api/health](http://localhost:8080/api/health)

---

## 📦 Production Packaging & Execution

The production build compiles the Java application and bundles the entire static frontend into a single self-contained JAR:

```bash
cd streamflix/backend
mvn clean package
```

Launch the generated artifact:

**Windows PowerShell:**
```powershell
$env:OMDB_API_KEY = "your_actual_omdb_key"
$env:PORT = "8080"
java -jar target/streamflix-1.0.0.jar
```

**Linux / macOS:**
```bash
export OMDB_API_KEY="your_actual_omdb_key"
export PORT=8080
java -jar target/streamflix-1.0.0.jar
```

---

## 🌐 API Endpoints Reference

All endpoints return clean JSON payloads:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health verification endpoint: `{"status": "UP"}` |
| `GET` | `/api/movies/search?query={q}&page={p}` | Search movies with pagination |
| `GET` | `/api/movies/{imdbId}` | Retrieve comprehensive movie metadata (e.g. `tt0468569`) |
| `GET` | `/api/series/search?query={q}&page={p}` | Search TV series with pagination |
| `GET` | `/api/series/{imdbId}` | Retrieve TV series metadata and seasons |
| `GET` | `/api/discover/{category}` | Retrieve curated title seeds for categories (`popular`, `action`, `comedy`, `drama`, `horror`, `scifi`, `romance`, `thriller`, `animation`, `crime`, `indian`, `hollywood`, `series`) |

---

## 🚀 Deployment Options

### OPTION A: Single Spring Boot Deployment (Recommended)
Deploy the unified Spring Boot JAR to any Java-compatible container or platform (Docker, AWS Elastic Beanstalk, Render, Railway, Google Cloud Run, Heroku, Azure App Service).
- Serves frontend at `/` and API at `/api/*` from the same origin.
- Zero CORS errors.
- Environment variables required: `OMDB_API_KEY`, `PORT` (automatically assigned by cloud hosts).

### OPTION B: Separate Frontend (Static Host) + Java Backend
- **Frontend**: Deploy `frontend/` folder to Vercel, Netlify, Cloudflare Pages, or GitHub Pages.
- **Backend**: Deploy `backend/` to a Java-capable platform.
- Configure backend `FRONTEND_URL` to match your frontend domain (e.g., `https://your-app.vercel.app`).
- Update `frontend/js/config.js` with your production backend API base URL.

---

## ⚖️ Legal Disclaimer

StreamFlix is an educational demonstration streaming interface. All movie and television metadata, ratings, and artwork links are provided through the OMDb API. StreamFlix does not host, pirate, or scrape unauthorized copyrighted film streams.
