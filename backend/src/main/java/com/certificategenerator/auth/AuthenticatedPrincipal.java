package com.certificategenerator.auth;

/** The authenticated identity extracted from a validated access token. */
public record AuthenticatedPrincipal(Long userId, String email, Role role) {}
