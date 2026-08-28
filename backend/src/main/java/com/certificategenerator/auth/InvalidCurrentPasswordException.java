package com.certificategenerator.auth;

/**
 * Thrown when a password-change request's current password does not match the stored hash;
 * mapped to a 400 with a field-level error on {@code currentPassword} by GlobalExceptionHandler.
 * Not 401: the session is valid, only the field is wrong.
 */
public class InvalidCurrentPasswordException extends RuntimeException {

    public InvalidCurrentPasswordException(String message) {
        super(message);
    }
}
