package com.certificategenerator.auth;

/**
 * Thrown when a password-change request's new password matches the current one; mapped to a 400
 * with a field-level error on {@code newPassword} by GlobalExceptionHandler. Not 401: the session
 * is valid, only the field is wrong.
 */
public class NewPasswordSameAsCurrentException extends RuntimeException {

    public NewPasswordSameAsCurrentException(String message) {
        super(message);
    }
}
