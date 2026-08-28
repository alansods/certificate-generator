package com.certificategenerator.auth.reset;

/** Thrown for an unknown, used or expired reset token; mapped to 400 by GlobalExceptionHandler. */
public class InvalidPasswordResetTokenException extends RuntimeException {

    public InvalidPasswordResetTokenException(String message) {
        super(message);
    }
}
