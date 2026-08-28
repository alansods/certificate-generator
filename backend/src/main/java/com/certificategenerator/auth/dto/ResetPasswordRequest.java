package com.certificategenerator.auth.dto;

import com.certificategenerator.auth.validation.ValidPassword;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank String token, @NotBlank @Size(max = 128) @ValidPassword String newPassword) {}
