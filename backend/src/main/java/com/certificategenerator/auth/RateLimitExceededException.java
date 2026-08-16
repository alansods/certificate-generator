package com.certificategenerator.auth;

/** Thrown when a client exceeds a configured rate limit; mapped to 429 by GlobalExceptionHandler. */
public class RateLimitExceededException extends RuntimeException {

    public RateLimitExceededException(String message) {
        super(message);
    }
}
