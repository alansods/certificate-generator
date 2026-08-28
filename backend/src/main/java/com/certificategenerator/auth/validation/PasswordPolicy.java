package com.certificategenerator.auth.validation;

/**
 * The one password rule shared by every path that sets a password: signup, reset and the profile
 * page's password change. Kept as a single constant so all three enforce the same thing.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;

    // Spring Security's BCrypt-backed PasswordEncoder throws IllegalArgumentException for any
    // password whose UTF-8 encoding exceeds 72 bytes. Left unchecked, that surfaces as an
    // unhandled 500 via GlobalExceptionHandler's catch-all, reachable by an unauthenticated
    // caller through POST /auth/register. Rejecting it here turns it into an ordinary 400 field
    // error instead.
    public static final int MAX_BYTES = 72;

    private PasswordPolicy() {}

    public static boolean isValid(String password) {
        return password != null
                && password.length() >= MIN_LENGTH
                && password.chars().anyMatch(Character::isDigit)
                && password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= MAX_BYTES;
    }
}
