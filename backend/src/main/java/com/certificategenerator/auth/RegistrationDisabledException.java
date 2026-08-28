package com.certificategenerator.auth;

/** Thrown when self-registration is turned off; mapped to 404 by GlobalExceptionHandler. */
public class RegistrationDisabledException extends RuntimeException {

    public RegistrationDisabledException(String message) {
        super(message);
    }
}
