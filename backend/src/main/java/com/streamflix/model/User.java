package com.streamflix.model;

public class User {
    private String id;
    private String name;
    private String email;
    private String passwordHash;
    private String salt;
    private long createdAt;
    private String role;

    public User() {}

    public User(String id, String name, String email, String passwordHash, String salt, long createdAt, String role) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.salt = salt;
        this.createdAt = createdAt;
        this.role = role;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getSalt() { return salt; }
    public void setSalt(String salt) { this.salt = salt; }

    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
