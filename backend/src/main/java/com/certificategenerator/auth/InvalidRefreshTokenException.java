package com.certificategenerator.auth;

/** Thrown when a refresh token is missing, expired, or already revoked (including reuse). */
public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException(String message) {
        super(message);
    }
}
