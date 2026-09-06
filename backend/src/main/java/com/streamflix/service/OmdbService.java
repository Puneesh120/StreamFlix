package com.streamflix.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.streamflix.model.Movie;
import com.streamflix.model.SearchResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class OmdbService {

    private static final Logger logger = LoggerFactory.getLogger(OmdbService.class);
    private static final long CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes

    @Value("${omdb.api.key:trilogy}")
    private String apiKey;

    @Value("${omdb.api.url:https://www.omdbapi.com/}")
    private String omdbUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // Thread-safe in-memory cache: URL/Key -> CachedEntry
    private final ConcurrentHashMap<String, CachedEntry> cache = new ConcurrentHashMap<>();

    private static class CachedEntry {
        final Object data;
        final long timestamp;

        CachedEntry(Object data) {
            this.data = data;
            this.timestamp = System.currentTimeMillis();
        }

        boolean isExpired() {
            return (System.currentTimeMillis() - timestamp) > CACHE_EXPIRATION_MS;
        }
    }

    // Curated discovery seed lists
    private static final Map<String, List<String>> DISCOVERY_SEEDS = new LinkedHashMap<>();
    static {
        DISCOVERY_SEEDS.put("popular", List.of("Inception", "Interstellar", "The Dark Knight", "Avengers: Endgame", "Avatar", "Gladiator", "Dune", "Oppenheimer"));
        DISCOVERY_SEEDS.put("top_rated", List.of("The Shawshank Redemption", "The Godfather", "The Dark Knight", "12 Angry Men", "Schindler's List", "Pulp Fiction", "Fight Club", "Forrest Gump"));
        DISCOVERY_SEEDS.put("action", List.of("Mad Max: Fury Road", "John Wick", "Top Gun: Maverick", "Mission: Impossible - Fallout", "Die Hard", "Gladiator", "The Batman", "The Matrix"));
        DISCOVERY_SEEDS.put("comedy", List.of("The Grand Budapest Hotel", "Superbad", "The Hangover", "Knives Out", "Deadpool", "Groundhog Day", "Step Brothers", "Palm Springs"));
        DISCOVERY_SEEDS.put("drama", List.of("The Shawshank Redemption", "The Godfather", "Fight Club", "Forrest Gump", "Parasite", "Whiplash", "Schindler's List", "Good Will Hunting"));
        DISCOVERY_SEEDS.put("horror", List.of("The Shining", "A Quiet Place", "Get Out", "Hereditary", "The Conjuring", "Halloween", "Alien", "Psycho"));
        DISCOVERY_SEEDS.put("scifi", List.of("Interstellar", "Blade Runner 2049", "The Matrix", "Inception", "Arrival", "Dune", "Ex Machina", "Edge of Tomorrow"));
        DISCOVERY_SEEDS.put("romance", List.of("La La Land", "Titanic", "Before Sunrise", "About Time", "The Notebook", "Pride & Prejudice", "Her", "Past Lives"));
        DISCOVERY_SEEDS.put("thriller", List.of("Se7en", "Shutter Island", "Gone Girl", "Zodiac", "Prisoners", "Memento", "The Silence of the Lambs", "Nightcrawler"));
        DISCOVERY_SEEDS.put("animation", List.of("Spirited Away", "Spider-Man: Into the Spider-Verse", "Toy Story", "WALL-E", "Coco", "Your Name", "Up", "The Lion King"));
        DISCOVERY_SEEDS.put("crime", List.of("Pulp Fiction", "GoodFellas", "The Departed", "The Godfather", "No Country for Old Men", "Heat", "Scarface", "Fargo"));
        DISCOVERY_SEEDS.put("indian", List.of("RRR", "3 Idiots", "Dangal", "Lagaan", "Baahubali: The Beginning", "Gangs of Wasseypur", "K.G.F: Chapter 1", "Drishyam"));
        DISCOVERY_SEEDS.put("hollywood", List.of("Titanic", "Avatar", "Jurassic Park", "The Avengers", "Pulp Fiction", "Inception", "Gladiator", "Forrest Gump"));
        DISCOVERY_SEEDS.put("series", List.of("Breaking Bad", "Stranger Things", "Game of Thrones", "Chernobyl", "Better Call Saul", "The Wire", "Dark", "Sherlock"));
    }

    // Curated high-definition official trailer IDs
    private static final Map<String, String> KNOWN_TRAILERS = new HashMap<>();
    static {
        KNOWN_TRAILERS.put("tt0468569", "EXeTwQWrcwY"); // The Dark Knight
        KNOWN_TRAILERS.put("tt1375666", "YoHD9XEInc0"); // Inception
        KNOWN_TRAILERS.put("tt0816692", "zSWdZVtXT7E"); // Interstellar
        KNOWN_TRAILERS.put("tt0372784", "neY2xVmOfUM"); // Batman Begins
        KNOWN_TRAILERS.put("tt1877830", "mqqft2x_Aa4"); // The Batman
        KNOWN_TRAILERS.put("tt4154796", "TcMBFSGVi1c"); // Avengers: Endgame
        KNOWN_TRAILERS.put("tt0499549", "5PSNL1qE6VY"); // Avatar
        KNOWN_TRAILERS.put("tt0172495", "owK1qxDselE"); // Gladiator
        KNOWN_TRAILERS.put("tt1160419", "n9xhJrPXop4"); // Dune
        KNOWN_TRAILERS.put("tt15398776", "uYPbbksJxIg"); // Oppenheimer
        KNOWN_TRAILERS.put("tt0133093", "vKQi3bBA1y8"); // The Matrix
        KNOWN_TRAILERS.put("tt0137523", "qtRKdVHc-c8"); // Fight Club
        KNOWN_TRAILERS.put("tt0111161", "PLl99DlL6b4"); // The Shawshank Redemption
        KNOWN_TRAILERS.put("tt0068646", "sY1S34973zA"); // The Godfather
        KNOWN_TRAILERS.put("tt0050083", "TEN-2uTi2c0"); // 12 Angry Men
        KNOWN_TRAILERS.put("tt0108052", "gG22XNhtnoY"); // Schindler's List
        KNOWN_TRAILERS.put("tt0110912", "s7EdQ4FqbhY"); // Pulp Fiction
        KNOWN_TRAILERS.put("tt0109830", "bLvqoHBptjg"); // Forrest Gump
        KNOWN_TRAILERS.put("tt6751668", "5xH0RZE7Z4l"); // Parasite
        KNOWN_TRAILERS.put("tt2582802", "7d_jQycdQGo"); // Whiplash
        KNOWN_TRAILERS.put("tt1392190", "hEJnMQG9ev8"); // Mad Max: Fury Road
        KNOWN_TRAILERS.put("tt2911666", "2AUmvWm5ZDQ"); // John Wick
        KNOWN_TRAILERS.put("tt1745960", "giXco2jaZ_4"); // Top Gun: Maverick
        KNOWN_TRAILERS.put("tt0095016", "jaJuw4mnSCg"); // Die Hard
        KNOWN_TRAILERS.put("tt2278388", "1Fg5iWmQjwk"); // The Grand Budapest Hotel
        KNOWN_TRAILERS.put("tt0829482", "4eaZ_48ZYog"); // Superbad
        KNOWN_TRAILERS.put("tt1119646", "tcdUhdOlz9M"); // The Hangover
        KNOWN_TRAILERS.put("tt8946378", "qGqiHJTsR4Q"); // Knives Out
        KNOWN_TRAILERS.put("tt1431045", "FyKWUTwSYAs"); // Deadpool
        KNOWN_TRAILERS.put("tt0107048", "tSVeDx9fk60"); // Groundhog Day
        KNOWN_TRAILERS.put("tt0838283", "CewglxElTW0"); // Step Brothers
        KNOWN_TRAILERS.put("tt8722346", "CpBLtXduh_k"); // Palm Springs
        KNOWN_TRAILERS.put("tt0081505", "S01444vdBDA"); // The Shining
        KNOWN_TRAILERS.put("tt6644200", "WR7cc5t7tv8"); // A Quiet Place
        KNOWN_TRAILERS.put("tt5052448", "DzfpyUB60YY"); // Get Out
        KNOWN_TRAILERS.put("tt7784604", "V6wWKNij_1M"); // Hereditary
        KNOWN_TRAILERS.put("tt1457767", "k10ETZ41q5o"); // The Conjuring
        KNOWN_TRAILERS.put("tt0077651", "xHuOtLTQ_1I"); // Halloween
        KNOWN_TRAILERS.put("tt0078748", "jQ5lPt9licg"); // Alien
        KNOWN_TRAILERS.put("tt0054215", "Wz719bWwg4w"); // Psycho
        KNOWN_TRAILERS.put("tt1856101", "gCcx85zbxz4"); // Blade Runner 2049
        KNOWN_TRAILERS.put("tt2543164", "tFMo3UJ4B4g"); // Arrival
        KNOWN_TRAILERS.put("tt0470752", "EoQuVnKhxaM"); // Ex Machina
        KNOWN_TRAILERS.put("tt1631867", "vw61gCe2oqI"); // Edge of Tomorrow
        KNOWN_TRAILERS.put("tt3783958", "0pdqf4P9MB8"); // La La Land
        KNOWN_TRAILERS.put("tt0120338", "2e-eXJ6HgkQ"); // Titanic
        KNOWN_TRAILERS.put("tt0112471", "6a_zfZfgqB0"); // Before Sunrise
        KNOWN_TRAILERS.put("tt2194499", "T7A810duHvw"); // About Time
        KNOWN_TRAILERS.put("tt0332280", "FC6biTjEyZw"); // The Notebook
        KNOWN_TRAILERS.put("tt0414387", "1dYv5u6v55Y"); // Pride & Prejudice
        KNOWN_TRAILERS.put("tt1798709", "dJTU48_yghs"); // Her
        KNOWN_TRAILERS.put("tt13238346", "kA244xewjcI"); // Past Lives
        KNOWN_TRAILERS.put("tt0114388", "znmZoVkCjpI"); // Se7en
        KNOWN_TRAILERS.put("tt1130884", "5iaYLCiq5RM"); // Shutter Island
        KNOWN_TRAILERS.put("tt2267998", "2-_-1nJf8Vg"); // Gone Girl
        KNOWN_TRAILERS.put("tt0443706", "yNncHPl1UXg"); // Zodiac
        KNOWN_TRAILERS.put("tt1392214", "bpXfcT6BpKU"); // Prisoners
        KNOWN_TRAILERS.put("tt0209144", "4CV41hoyS8A"); // Memento
        KNOWN_TRAILERS.put("tt0102926", "W6Mm8Sbe__o"); // The Silence of the Lambs
        KNOWN_TRAILERS.put("tt2872718", "u1uP_8v0UeM"); // Nightcrawler
        KNOWN_TRAILERS.put("tt0245429", "ByXuk9QqQkk"); // Spirited Away
        KNOWN_TRAILERS.put("tt4633694", "tg52up16eq0"); // Spider-Man: Into the Spider-Verse
        KNOWN_TRAILERS.put("tt0114709", "v-PjgYDrg70"); // Toy Story
        KNOWN_TRAILERS.put("tt0910970", "CZ1CATNbXg0"); // WALL-E
        KNOWN_TRAILERS.put("tt2380307", "xlnPHG3zXdc"); // Coco
        KNOWN_TRAILERS.put("tt5311514", "xU47nhruN-Q"); // Your Name
        KNOWN_TRAILERS.put("tt1049413", "HWEW_qTLSEE"); // Up
        KNOWN_TRAILERS.put("tt0110357", "lFzVJEksoDY"); // The Lion King
        KNOWN_TRAILERS.put("tt0099685", "2ilzidi_J8Q"); // GoodFellas
        KNOWN_TRAILERS.put("tt0407887", "iojhqm0JTW4"); // The Departed
        KNOWN_TRAILERS.put("tt0477348", "38A__WT3-o0"); // No Country for Old Men
        KNOWN_TRAILERS.put("tt0113277", "0xbBLJ1WGwQ"); // Heat
        KNOWN_TRAILERS.put("tt0086250", "7pQQHnqBa2E"); // Scarface
        KNOWN_TRAILERS.put("tt0116282", "EB4NmT634nw"); // Fargo
        KNOWN_TRAILERS.put("tt8178634", "f_vbAtFSEc0"); // RRR
        KNOWN_TRAILERS.put("tt1187043", "K0eDlFX9GMc"); // 3 Idiots
        KNOWN_TRAILERS.put("tt5074352", "x_7YlGv9u1g"); // Dangal
        KNOWN_TRAILERS.put("tt0169102", "oSIGQ0NaBag"); // Lagaan
        KNOWN_TRAILERS.put("tt2631186", "sOEg_YZQsTI"); // Baahubali: The Beginning
        KNOWN_TRAILERS.put("tt1954470", "j-5_GhyZ8aA"); // Gangs of Wasseypur
        KNOWN_TRAILERS.put("tt7181546", "-KfsY-qwBS0"); // K.G.F: Chapter 1
        KNOWN_TRAILERS.put("tt4430212", "AuuX2j14NBg"); // Drishyam
        KNOWN_TRAILERS.put("tt0107290", "lc0UehYemQA"); // Jurassic Park
        KNOWN_TRAILERS.put("tt0848228", "eOrNdBpGMv8"); // The Avengers
        KNOWN_TRAILERS.put("tt0903747", "HhesaQXLuRY"); // Breaking Bad
        KNOWN_TRAILERS.put("tt4574334", "b9EkMc79ZSU"); // Stranger Things
        KNOWN_TRAILERS.put("tt0944947", "KPLWWIOCOOQ"); // Game of Thrones
        KNOWN_TRAILERS.put("tt8772262", "s9APLXM9Ei8"); // Chernobyl
        KNOWN_TRAILERS.put("tt3032476", "HN4oyhmgopA"); // Better Call Saul
        KNOWN_TRAILERS.put("tt0306414", "9qK-VGjMr8g"); // The Wire
        KNOWN_TRAILERS.put("tt5753856", "rrwycJ08PSA"); // Dark
        KNOWN_TRAILERS.put("tt4786824", "JWtnJjn6ng0"); // The Crown
        KNOWN_TRAILERS.put("tt1475582", "xK7S9mrFWL4"); // Sherlock
    }

    private static final Pattern YOUTUBE_VIDEO_ID_PATTERN = Pattern.compile("\"videoId\":\"([a-zA-Z0-9_-]{11})\"");

    public OmdbService(RestTemplateBuilder builder, ObjectMapper objectMapper) {
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(6))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = objectMapper;
    }

    /**
     * Search movies by query keyword
     */
    public SearchResponse searchMovies(String query, int page) {
        return searchOmdb(query, page, "movie");
    }

    /**
     * Search series by query keyword
     */
    public SearchResponse searchSeries(String query, int page) {
        return searchOmdb(query, page, "series");
    }

    /**
     * Search general OMDb catalog with in-memory caching
     */
    public SearchResponse searchOmdb(String query, int page, String type) {
        if (query == null || query.trim().isEmpty()) {
            return new SearchResponse(Collections.emptyList(), "0", "False", "Search query cannot be empty");
        }

        String safeQuery = query.trim();
        int safePage = Math.max(1, page);

        String cacheKey = "SEARCH:" + safeQuery.toLowerCase() + ":P" + safePage + ":T" + (type != null ? type : "all");
        CachedEntry cached = cache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return (SearchResponse) cached.data;
        }

        String effectiveKey = (apiKey != null && !apiKey.trim().isEmpty()) ? apiKey.trim() : "trilogy";

        StringBuilder urlBuilder = new StringBuilder(omdbUrl);
        urlBuilder.append(omdbUrl.contains("?") ? "&" : "?")
                .append("apikey=").append(effectiveKey)
                .append("&s=").append(URLEncoder.encode(safeQuery, StandardCharsets.UTF_8))
                .append("&page=").append(safePage);

        if (type != null && !type.isEmpty() && !"all".equalsIgnoreCase(type)) {
            urlBuilder.append("&type=").append(type);
        }

        String targetUrl = urlBuilder.toString();

        try {
            logger.info("Executing OMDb search query='{}', page={}, type={}", safeQuery, safePage, type);
            ResponseEntity<String> response = restTemplate.getForEntity(targetUrl, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                SearchResponse searchResponse = objectMapper.readValue(response.getBody(), SearchResponse.class);
                if ("True".equalsIgnoreCase(searchResponse.getResponse())) {
                    cache.put(cacheKey, new CachedEntry(searchResponse));
                }
                return searchResponse;
            } else {
                return new SearchResponse(Collections.emptyList(), "0", "False", "Failed to retrieve results from OMDb");
            }
        } catch (ResourceAccessException e) {
            logger.error("Connection timeout calling OMDb API: {}", e.getMessage());
            return new SearchResponse(Collections.emptyList(), "0", "False", "OMDb service connection timed out");
        } catch (Exception e) {
            logger.error("Error calling OMDb search: {}", e.getMessage());
            return new SearchResponse(Collections.emptyList(), "0", "False", "An unexpected error occurred while searching");
        }
    }

    /**
     * Get detailed metadata for a movie or series by IMDb ID
     */
    public Movie getMovieByImdbId(String imdbId) {
        if (imdbId == null || !imdbId.matches("^tt\\d+$")) {
            Movie err = new Movie();
            err.setResponse("False");
            err.setError("Invalid IMDb ID format. Expected format: tt0000000");
            return err;
        }

        String cacheKey = "ID:" + imdbId;
        CachedEntry cached = cache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return (Movie) cached.data;
        }

        String effectiveKey = (apiKey != null && !apiKey.trim().isEmpty()) ? apiKey.trim() : "trilogy";

        String targetUrl = omdbUrl + (omdbUrl.contains("?") ? "&" : "?")
                + "apikey=" + effectiveKey
                + "&i=" + imdbId
                + "&plot=full";

        try {
            logger.info("Fetching OMDb details for IMDb ID: {}", imdbId);
            ResponseEntity<String> response = restTemplate.getForEntity(targetUrl, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Movie movie = objectMapper.readValue(response.getBody(), Movie.class);
                if ("True".equalsIgnoreCase(movie.getResponse())) {
                    cache.put(cacheKey, new CachedEntry(movie));
                }
                return movie;
            } else {
                Movie err = new Movie();
                err.setResponse("False");
                err.setError("Movie not found");
                return err;
            }
        } catch (ResourceAccessException e) {
            logger.error("Timeout fetching IMDb ID {}: {}", imdbId, e.getMessage());
            Movie err = new Movie();
            err.setResponse("False");
            err.setError("OMDb service connection timed out");
            return err;
        } catch (Exception e) {
            logger.error("Error fetching movie {}: {}", imdbId, e.getMessage());
            Movie err = new Movie();
            err.setResponse("False");
            err.setError("An error occurred while fetching movie details");
            return err;
        }
    }

    /**
     * Get movie by Title
     */
    public Movie getMovieByTitle(String title, String type) {
        if (title == null || title.trim().isEmpty()) {
            return null;
        }

        String cacheKey = "TITLE:" + title.toLowerCase().trim() + ":" + (type != null ? type : "all");
        CachedEntry cached = cache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return (Movie) cached.data;
        }

        String effectiveKey = (apiKey != null && !apiKey.trim().isEmpty()) ? apiKey.trim() : "trilogy";

        StringBuilder urlBuilder = new StringBuilder(omdbUrl);
        urlBuilder.append(omdbUrl.contains("?") ? "&" : "?")
                .append("apikey=").append(effectiveKey)
                .append("&t=").append(URLEncoder.encode(title.trim(), StandardCharsets.UTF_8))
                .append("&plot=short");

        if (type != null && !type.isEmpty() && !"all".equalsIgnoreCase(type)) {
            urlBuilder.append("&type=").append(type);
        }

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(urlBuilder.toString(), String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Movie movie = objectMapper.readValue(response.getBody(), Movie.class);
                if ("True".equalsIgnoreCase(movie.getResponse())) {
                    cache.put(cacheKey, new CachedEntry(movie));
                    return movie;
                }
            }
        } catch (Exception e) {
            logger.warn("Could not fetch title '{}': {}", title, e.getMessage());
        }
        return null;
    }

    /**
     * High-speed parallel discovery fetching with caching
     */
    @SuppressWarnings("unchecked")
    public List<Movie> getDiscoverMovies(String category) {
        String catKey = (category == null ? "popular" : category.toLowerCase().trim());

        // 1. Check discovery cache
        String cacheKey = "DISCOVER:" + catKey;
        CachedEntry cached = cache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return (List<Movie>) cached.data;
        }

        List<String> seeds = DISCOVERY_SEEDS.getOrDefault(catKey, DISCOVERY_SEEDS.get("popular"));
        String type = "series".equalsIgnoreCase(catKey) ? "series" : "movie";

        // 2. Fetch seed titles in parallel for blazing-fast response times
        List<CompletableFuture<Movie>> futures = seeds.stream()
                .limit(8)
                .map(title -> CompletableFuture.supplyAsync(() -> getMovieByTitle(title, type)))
                .collect(Collectors.toList());

        List<Movie> results = new ArrayList<>();
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .get(8, TimeUnit.SECONDS); // 8 second max parallel budget

            for (CompletableFuture<Movie> f : futures) {
                Movie m = f.getNow(null);
                if (m != null && m.getImdbID() != null && "True".equalsIgnoreCase(m.getResponse())) {
                    results.add(m);
                }
            }
        } catch (Exception e) {
            logger.warn("Parallel discovery fetch completed partially for category {}: {}", catKey, e.getMessage());
            for (CompletableFuture<Movie> f : futures) {
                Movie m = f.getNow(null);
                if (m != null && m.getImdbID() != null) {
                    results.add(m);
                }
            }
        }

        // 3. Fallback to keyword search if seeds returned too few results
        if (results.size() < 3) {
            logger.info("Seeding category '{}' via search query fallback", catKey);
            String queryWord = getSearchFallbackWord(catKey);
            SearchResponse sr = searchOmdb(queryWord, 1, type);
            if (sr != null && sr.getSearch() != null && !sr.getSearch().isEmpty()) {
                for (Movie m : sr.getSearch()) {
                    if (results.stream().noneMatch(x -> x.getImdbID().equals(m.getImdbID()))) {
                        results.add(m);
                    }
                }
            }
        }

        if (!results.isEmpty()) {
            cache.put(cacheKey, new CachedEntry(results));
        }

        return results;
    }

    private String getSearchFallbackWord(String catKey) {
        return switch (catKey) {
            case "action" -> "action";
            case "comedy" -> "comedy";
            case "horror" -> "horror";
            case "scifi" -> "space";
            case "romance" -> "love";
            case "thriller" -> "thriller";
            case "animation" -> "animated";
            case "crime" -> "police";
            case "indian" -> "khan";
            case "series" -> "game";
            default -> "star";
        };
    }

    public boolean isApiKeyConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    /**
     * Resolve official high-definition trailer video ID and embed URL for any IMDb ID.
     */
    public Map<String, String> resolveTrailer(String imdbId, String title, String year) {
        if (imdbId != null && KNOWN_TRAILERS.containsKey(imdbId)) {
            String trailerId = KNOWN_TRAILERS.get(imdbId);
            return buildTrailerResponse(imdbId, trailerId);
        }

        String cacheKey = "trailer:" + imdbId;
        CachedEntry cached = cache.get(cacheKey);
        if (cached != null && !cached.isExpired() && cached.data instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, String> res = (Map<String, String>) cached.data;
            return res;
        }

        // Determine title if not passed
        String searchTitle = title;
        if (searchTitle == null || searchTitle.isBlank()) {
            try {
                Movie movie = getMovieByImdbId(imdbId);
                if (movie != null && movie.getTitle() != null) {
                    searchTitle = movie.getTitle();
                    if (year == null || year.isBlank()) {
                        year = movie.getYear();
                    }
                }
            } catch (Exception ignored) {}
        }

        if (searchTitle == null || searchTitle.isBlank()) {
            searchTitle = "Movie";
        }

        try {
            String query = (searchTitle + " " + (year != null ? year : "") + " official trailer").trim();
            String ytUrl = "https://www.youtube.com/results?search_query=" + URLEncoder.encode(query, StandardCharsets.UTF_8);

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("Accept-Language", "en-US,en;q=0.9");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(ytUrl, HttpMethod.GET, entity, String.class);
            if (response.getBody() != null) {
                Matcher matcher = YOUTUBE_VIDEO_ID_PATTERN.matcher(response.getBody());
                if (matcher.find()) {
                    String videoId = matcher.group(1);
                    Map<String, String> result = buildTrailerResponse(imdbId, videoId);
                    cache.put(cacheKey, new CachedEntry(result));
                    return result;
                }
            }
        } catch (Exception e) {
            logger.warn("Dynamic YouTube trailer lookup failed for {}: {}", imdbId, e.getMessage());
        }

        // Fallback to verified popular trailer embed
        Map<String, String> fallback = buildTrailerResponse(imdbId, "YoHD9XEInc0");
        return fallback;
    }

    private Map<String, String> buildTrailerResponse(String imdbId, String videoId) {
        return Map.of(
            "imdbId", imdbId != null ? imdbId : "",
            "trailerId", videoId,
            "embedUrl", "https://www.youtube-nocookie.com/embed/" + videoId + "?autoplay=1&enablejsapi=1&rel=0&modestbranding=1"
        );
    }
}
