package com.streamflix.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addMapping("/api/**")
                .allowedOriginPatterns("http://localhost:[*]", "http://127.0.0.1:[*]", "https://*.vercel.app", "https://*.netlify.app", "https://*.onrender.com")
                .allowedOrigins(origins)
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("Origin", "Content-Type", "Accept", "Authorization")
                .maxAge(3600);
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Forward clean paths without .html to corresponding static templates
        registry.addViewController("/movies").setViewName("forward:/movies.html");
        registry.addViewController("/series").setViewName("forward:/series.html");
        registry.addViewController("/search").setViewName("forward:/search.html");
        registry.addViewController("/my-list").setViewName("forward:/my-list.html");
        registry.addViewController("/history").setViewName("forward:/history.html");
        registry.addViewController("/profiles").setViewName("forward:/profiles.html");
        registry.addViewController("/login").setViewName("forward:/login.html");
        registry.addViewController("/settings").setViewName("forward:/settings.html");
        registry.addViewController("/watch").setViewName("forward:/watch.html");
        registry.addViewController("/movie-details").setViewName("forward:/movie-details.html");
        registry.addViewController("/series-details").setViewName("forward:/series-details.html");
    }
}
