package com.streamflix.controller;

import com.streamflix.model.*;
import com.streamflix.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request.getName(), request.getEmail(), request.getPassword());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError(e.getMessage(), 400));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiError("Registration failed. Please try again.", 500));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request) {
        try {
            AuthResponse response = authService.login(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError(e.getMessage(), 401));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(new ApiError(e.getMessage(), 429));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiError("Login failed. Please try again.", 500));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null) {
            authService.logout(authHeader.replace("Bearer ", "").trim());
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("Authorization token required", 401));
        }

        User user = authService.getUserByToken(authHeader);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("Invalid or expired session token", 401));
        }

        return ResponseEntity.ok(Map.of(
                "userId", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole(),
                "createdAt", user.getCreatedAt()
        ));
    }
}
