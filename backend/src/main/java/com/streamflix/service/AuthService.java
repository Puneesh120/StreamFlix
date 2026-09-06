package com.streamflix.service;

import com.streamflix.model.AuthResponse;
import com.streamflix.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private static final int ITERATIONS = 65536;
    private static final int KEY_LENGTH = 256;
    private static final int SALT_LENGTH = 16;
    private static final long SESSION_DURATION_MS = 24 * 60 * 60 * 1000L; // 24 Hours
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_MS = 60 * 1000L; // 1 minute lockout

    private final SecureRandom secureRandom = new SecureRandom();

    // In-memory thread-safe user database
    private final ConcurrentHashMap<String, User> users = new ConcurrentHashMap<>();

    // Session token -> SessionInfo
    private final ConcurrentHashMap<String, SessionInfo> sessions = new ConcurrentHashMap<>();

    // Brute force protection: email -> AttemptInfo
    private final ConcurrentHashMap<String, AttemptInfo> failedAttempts = new ConcurrentHashMap<>();

    public static class SessionInfo {
        public final String userId;
        public final String email;
        public final long expiresAt;

        public SessionInfo(String userId, String email, long expiresAt) {
            this.userId = userId;
            this.email = email;
            this.expiresAt = expiresAt;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }

    private static class AttemptInfo {
        int count;
        long lastAttemptTime;
        long lockedUntil;

        AttemptInfo() {
            this.count = 1;
            this.lastAttemptTime = System.currentTimeMillis();
            this.lockedUntil = 0;
        }

        boolean isLocked() {
            return System.currentTimeMillis() < lockedUntil;
        }
    }

    public AuthService() {
        // Seed default demo user with secure salted hash
        seedUser("Demo User", "demo@streamflix.com", "Password123!", "USER");
        seedUser("Admin", "admin@streamflix.com", "StreamFlixAdmin2026!", "ADMIN");
        seedUser("Member", "user@streamflix.com", "StreamFlix2026!", "USER");
    }

    private void seedUser(String name, String email, String password, String role) {
        try {
            byte[] salt = generateSalt();
            String saltBase64 = Base64.getEncoder().encodeToString(salt);
            String hash = hashPassword(password, salt);
            String id = UUID.randomUUID().toString();
            User user = new User(id, name, email.toLowerCase(), hash, saltBase64, System.currentTimeMillis(), role);
            users.put(email.toLowerCase(), user);
        } catch (Exception e) {
            logger.error("Failed seeding user {}: {}", email, e.getMessage());
        }
    }

    public AuthResponse register(String name, String email, String password) {
        String cleanEmail = email.trim().toLowerCase();
        if (users.containsKey(cleanEmail)) {
            throw new IllegalArgumentException("An account with this email address already exists.");
        }

        validatePasswordStrength(password);

        try {
            byte[] salt = generateSalt();
            String saltBase64 = Base64.getEncoder().encodeToString(salt);
            String hash = hashPassword(password, salt);
            String id = UUID.randomUUID().toString();
            String cleanName = sanitizeName(name);

            User user = new User(id, cleanName, cleanEmail, hash, saltBase64, System.currentTimeMillis(), "USER");
            users.put(cleanEmail, user);

            // Generate secure session token
            String token = generateSecureToken();
            long expiresAt = System.currentTimeMillis() + SESSION_DURATION_MS;
            sessions.put(token, new SessionInfo(id, cleanEmail, expiresAt));

            return new AuthResponse(token, id, cleanName, cleanEmail, "USER", SESSION_DURATION_MS / 1000, "Registration successful");
        } catch (Exception e) {
            logger.error("Registration error: {}", e.getMessage());
            throw new RuntimeException("Unable to complete registration. Please try again.");
        }
    }

    public AuthResponse login(String email, String password) {
        String cleanEmail = email.trim().toLowerCase();

        // Check brute-force lockout
        AttemptInfo attempt = failedAttempts.get(cleanEmail);
        if (attempt != null && attempt.isLocked()) {
            long remainingSeconds = (attempt.lockedUntil - System.currentTimeMillis()) / 1000;
            throw new IllegalStateException("Too many failed attempts. Account temporarily locked. Try again in " + remainingSeconds + "s.");
        }

        User user = users.get(cleanEmail);
        boolean passwordValid = false;

        if (user != null) {
            try {
                byte[] salt = Base64.getDecoder().decode(user.getSalt());
                passwordValid = verifyPassword(password, salt, user.getPasswordHash());
            } catch (Exception e) {
                logger.error("Error verifying password: {}", e.getMessage());
            }
        }

        if (!passwordValid) {
            recordFailedAttempt(cleanEmail);
            throw new IllegalArgumentException("Invalid email address or password.");
        }

        // Reset failed attempts on success
        failedAttempts.remove(cleanEmail);

        // Generate fresh secure session token
        String token = generateSecureToken();
        long expiresAt = System.currentTimeMillis() + SESSION_DURATION_MS;
        sessions.put(token, new SessionInfo(user.getId(), cleanEmail, expiresAt));

        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole(), SESSION_DURATION_MS / 1000, "Login successful");
    }

    public boolean logout(String token) {
        if (token != null) {
            return sessions.remove(token) != null;
        }
        return false;
    }

    public User getUserByToken(String token) {
        if (token == null || token.isBlank()) return null;

        // Strip Bearer prefix if provided
        if (token.startsWith("Bearer ")) {
            token = token.substring(7).trim();
        }

        SessionInfo info = sessions.get(token);
        if (info == null || info.isExpired()) {
            if (info != null) sessions.remove(token);
            return null;
        }

        return users.get(info.email);
    }

    private void recordFailedAttempt(String email) {
        failedAttempts.compute(email, (k, v) -> {
            if (v == null) {
                return new AttemptInfo();
            }
            v.count++;
            v.lastAttemptTime = System.currentTimeMillis();
            if (v.count >= MAX_FAILED_ATTEMPTS) {
                v.lockedUntil = System.currentTimeMillis() + LOCKOUT_DURATION_MS;
                logger.warn("Account {} locked for 60s due to repeated failed login attempts", email);
            }
            return v;
        });
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long.");
        }
        boolean hasLetter = false;
        boolean hasDigit = false;
        for (char c : password.toCharArray()) {
            if (Character.isLetter(c)) hasLetter = true;
            if (Character.isDigit(c)) hasDigit = true;
        }
        if (!hasLetter || !hasDigit) {
            throw new IllegalArgumentException("Password must contain both letters and numbers.");
        }
    }

    private String sanitizeName(String name) {
        if (name == null) return "Member";
        String clean = name.trim().replaceAll("[<>\"]", "");
        return clean.isEmpty() ? "Member" : clean;
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private byte[] generateSalt() {
        byte[] salt = new byte[SALT_LENGTH];
        secureRandom.nextBytes(salt);
        return salt;
    }

    private String hashPassword(String password, byte[] salt) throws NoSuchAlgorithmException, InvalidKeySpecException {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, ITERATIONS, KEY_LENGTH);
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        byte[] hash = factory.generateSecret(spec).getEncoded();
        return Base64.getEncoder().encodeToString(hash);
    }

    private boolean verifyPassword(String password, byte[] salt, String expectedHash) throws NoSuchAlgorithmException, InvalidKeySpecException {
        String computedHash = hashPassword(password, salt);
        return computedHash.equals(expectedHash);
    }
}
