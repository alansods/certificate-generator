package com.certificategenerator.auth.dto;

import com.certificategenerator.auth.validation.ValidPassword;
import jakarta.validation.constraints.NotBlank;

/**
 * {@code refreshToken} is the caller's own token, sent so the server knows which session to keep
 * alive when it revokes the rest (see design.md "Why the password change revokes other sessions").
 */
public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @ValidPassword String newPassword,
        @NotBlank String refreshToken) {}
