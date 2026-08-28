package com.certificategenerator.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * No role field: the role cannot be changed through this endpoint. The 255-character caps match
 * the {@code full_name} and {@code email} column widths in
 * V2__users_and_refresh_tokens.sql.
 */
public record UpdateProfileRequest(
        @NotBlank @Size(max = 255) String fullName,
        @NotBlank @Email @Size(max = 255) String email) {}
