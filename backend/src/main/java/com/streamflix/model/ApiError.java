package com.streamflix.model;

public class ApiError {
    private boolean success;
    private String message;
    private int status;
    private long timestamp;

    public ApiError() {
        this.success = false;
        this.timestamp = System.currentTimeMillis();
    }

    public ApiError(String message, int status) {
        this.success = false;
        this.message = message;
        this.status = status;
        this.timestamp = System.currentTimeMillis();
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}
