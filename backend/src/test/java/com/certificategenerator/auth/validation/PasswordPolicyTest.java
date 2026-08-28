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
}
