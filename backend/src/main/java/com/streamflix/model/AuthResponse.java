package com.streamflix.model;

public class AuthResponse {
    private String token;
    private String userId;
    private String name;
    private String email;
    private String role;
    private long expiresIn;
    private String message;

    public AuthResponse() {}

    public AuthResponse(String token, String userId, String name, String email, String role, long expiresIn, String message) {
        this.token = token;
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.expiresIn = expiresIn;
        this.message = message;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public long getExpiresIn() { return expiresIn; }
    public void setExpiresIn(long expiresIn) { this.expiresIn = expiresIn; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
