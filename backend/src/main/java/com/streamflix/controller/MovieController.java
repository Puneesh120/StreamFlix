package com.streamflix.controller;

import com.streamflix.model.ApiError;
import com.streamflix.model.Movie;
import com.streamflix.model.SearchResponse;
import com.streamflix.service.OmdbService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MovieController {

    private final OmdbService omdbService;

    public MovieController(OmdbService omdbService) {
        this.omdbService = omdbService;
    }

    /**
     * Health check endpoint used to verify deployment status.
     * Returns: {"status": "UP"}
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    /**
     * Search movies by query and page
     */
    @GetMapping("/movies/search")
    public ResponseEntity<?> searchMovies(
            @RequestParam(name = "query", required = false) String query,
            @RequestParam(name = "page", defaultValue = "1") int page) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("Query parameter 'query' is required", 400));
        }
        if (page < 1) {
            page = 1;
        }

        SearchResponse response = omdbService.searchMovies(query, page);
        if ("False".equalsIgnoreCase(response.getResponse())) {
            if ("Movie not found!".equalsIgnoreCase(response.getError())) {
                return ResponseEntity.ok(new SearchResponse(Collections.emptyList(), "0", "True", null));
            }
            if (response.getError() != null && response.getError().toLowerCase().contains("timed out")) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(new ApiError("Movie service is temporarily unavailable. Please try again later.", 503));
            }
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Get movie details by IMDb ID
     */
    @GetMapping("/movies/{imdbId}")
    public ResponseEntity<?> getMovie(@PathVariable("imdbId") String imdbId) {
        if (imdbId == null || !imdbId.matches("^tt\\d+$")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("Invalid IMDb ID format", 400));
        }

        Movie movie = omdbService.getMovieByImdbId(imdbId);
        if ("False".equalsIgnoreCase(movie.getResponse())) {
            if (movie.getError() != null && movie.getError().toLowerCase().contains("timed out")) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(new ApiError("Movie service is temporarily unavailable", 503));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiError(movie.getError() != null ? movie.getError() : "Movie not found", 404));
        }

        return ResponseEntity.ok(movie);
    }

    /**
     * Search series by query and page
     */
    @GetMapping("/series/search")
    public ResponseEntity<?> searchSeries(
            @RequestParam(name = "query", required = false) String query,
            @RequestParam(name = "page", defaultValue = "1") int page) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("Query parameter 'query' is required", 400));
        }
        if (page < 1) {
            page = 1;
        }

        SearchResponse response = omdbService.searchSeries(query, page);
        if ("False".equalsIgnoreCase(response.getResponse())) {
            if ("Series not found!".equalsIgnoreCase(response.getError()) || "Movie not found!".equalsIgnoreCase(response.getError())) {
                return ResponseEntity.ok(new SearchResponse(Collections.emptyList(), "0", "True", null));
            }
            if (response.getError() != null && response.getError().toLowerCase().contains("timed out")) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(new ApiError("Series service is temporarily unavailable. Please try again later.", 503));
            }
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Get series details by IMDb ID
     */
    @GetMapping("/series/{imdbId}")
    public ResponseEntity<?> getSeries(@PathVariable("imdbId") String imdbId) {
        return getMovie(imdbId);
    }

    /**
     * Category discover endpoints
     */
    @GetMapping("/discover/{category}")
    public ResponseEntity<List<Movie>> discover(@PathVariable("category") String category) {
        List<Movie> movies = omdbService.getDiscoverMovies(category);
        return ResponseEntity.ok(movies);
    }

    /**
     * Resolve trailer video ID and embed URL for any title
     */
    @GetMapping("/trailers/{imdbId}")
    public ResponseEntity<?> getTrailer(
            @PathVariable("imdbId") String imdbId,
            @RequestParam(name = "title", required = false) String title,
            @RequestParam(name = "year", required = false) String year) {
        if (imdbId == null || !imdbId.matches("^tt\\d+$")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("Invalid IMDb ID format", 400));
        }
        Map<String, String> trailer = omdbService.resolveTrailer(imdbId, title, year);
        return ResponseEntity.ok(trailer);
    }
}
