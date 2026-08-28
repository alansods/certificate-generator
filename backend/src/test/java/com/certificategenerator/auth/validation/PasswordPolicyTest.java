package com.certificategenerator.auth.validation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordPolicyTest {

    @Test
    void rejectsNull() {
        assertThat(PasswordPolicy.isValid(null)).isFalse();
    }

    @Test
    void rejectsShorterThanEightCharacters() {
        assertThat(PasswordPolicy.isValid("ab1")).isFalse();
    }

    @Test
    void rejectsExactlySevenCharactersEvenWithADigit() {
        assertThat(PasswordPolicy.isValid("abcdef1")).isFalse();
    }

    @Test
    void rejectsEightCharactersWithNoDigit() {
        assertThat(PasswordPolicy.isValid("abcdefgh")).isFalse();
    }

    @Test
    void acceptsExactlyEightCharactersWithADigit() {
        assertThat(PasswordPolicy.isValid("abcdefg1")).isTrue();
    }

    @Test
    void acceptsLongerPasswordsWithADigit() {
        assertThat(PasswordPolicy.isValid("a-much-longer-passphrase-9")).isTrue();
    }

    @Test
    void acceptsExactlySeventyTwoBytes() {
        // 1 digit + 71 ASCII letters == 72 bytes in UTF-8, right at BCrypt's limit.
        String password = "1" + "a".repeat(71);
        assertThat(password.getBytes(java.nio.charset.StandardCharsets.UTF_8)).hasSize(72);
        assertThat(PasswordPolicy.isValid(password)).isTrue();
    }

    @Test
    void rejectsSeventyThreeBytes() {
        // 1 digit + 72 ASCII letters == 73 bytes, one over BCrypt's limit.
        String password = "1" + "a".repeat(72);
        assertThat(password.getBytes(java.nio.charset.StandardCharsets.UTF_8)).hasSize(73);
        assertThat(PasswordPolicy.isValid(password)).isFalse();
    }

    @Test
    void rejectsSeventyThreeBytesWithAMultiByteCharacter() {
        // 'é' is 2 bytes in UTF-8, so 1 digit + 70 ASCII letters + 1 'é' == 73 bytes even though
        // the character count is only 72 — proves the check counts bytes, not chars.
        String password = "1" + "a".repeat(70) + "é";
        assertThat(password).hasSize(72);
        assertThat(password.getBytes(java.nio.charset.StandardCharsets.UTF_8)).hasSize(73);
        assertThat(PasswordPolicy.isValid(password)).isFalse();
    }
}
