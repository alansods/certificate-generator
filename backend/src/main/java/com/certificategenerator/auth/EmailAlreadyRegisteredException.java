package com.certificategenerator.auth;

/** Thrown when an email is already registered to another user; mapped to 409 by GlobalExceptionHandler. */
public class EmailAlreadyRegisteredException extends RuntimeException {

    public EmailAlreadyRegisteredException(String message) {
        super(message);
    }
}
