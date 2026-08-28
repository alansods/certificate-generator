package com.certificategenerator.auth.dto;

import com.certificategenerator.auth.validation.ValidPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Role is never accepted here: every self-registered account is Role.USER. */
public record RegisterRequest(
        @NotBlank @Size(max = 255) String fullName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 128) @ValidPassword String password) {}
