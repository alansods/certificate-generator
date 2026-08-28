package com.certificategenerator.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** No role field: the role cannot be changed through this endpoint. */
public record UpdateProfileRequest(@NotBlank String fullName, @NotBlank @Email String email) {}
