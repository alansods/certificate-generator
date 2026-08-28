package com.certificategenerator.auth.dto;

import com.certificategenerator.auth.validation.ValidPassword;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code refreshToken} is the caller's own token, sent so the server knows which session to keep
 * alive when it revokes the rest (see design.md "Why the password change revokes other sessions").
 * The 128-character caps on both password fields are a sane upper bound well above the policy
 * minimum, guarding against pathologically large inputs reaching BCrypt.
 */
public record ChangePasswordRequest(
        @NotBlank @Size(max = 128) String currentPassword,
        @NotBlank @Size(max = 128) @ValidPassword String newPassword,
        @NotBlank String refreshToken) {}
