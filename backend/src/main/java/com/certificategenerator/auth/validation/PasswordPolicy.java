package com.certificategenerator.auth.validation;

/**
 * The one password rule shared by every path that sets a password: signup, reset and the profile
 * page's password change. Kept as a single constant so all three enforce the same thing.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;

    private PasswordPolicy() {}

    public static boolean isValid(String password) {
        return password != null
                && password.length() >= MIN_LENGTH
                && password.chars().anyMatch(Character::isDigit);
    }
}
