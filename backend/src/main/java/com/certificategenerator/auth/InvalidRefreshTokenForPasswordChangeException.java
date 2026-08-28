package com.certificategenerator.auth;

/**
 * Thrown when {@code changePassword}'s refresh token (unknown, revoked, or belonging to another
 * user) is rejected by {@link RefreshTokenService#revokeAllExcept}; mapped to a 400 with a
 * field-level error on {@code refreshToken} by GlobalExceptionHandler. Deliberately not the 401
 * that {@link InvalidRefreshTokenException} maps to elsewhere: the caller's access token was
 * valid, so a 401 here would make the frontend's refresh-and-retry interceptor loop pointlessly.
 */
public class InvalidRefreshTokenForPasswordChangeException extends RuntimeException {

    public InvalidRefreshTokenForPasswordChangeException(String message) {
        super(message);
    }
}
