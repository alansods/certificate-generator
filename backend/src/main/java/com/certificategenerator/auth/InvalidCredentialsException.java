package com.certificategenerator.auth;

/** Thrown on a failed login; the message is never surfaced to the client (401, generic detail). */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}
