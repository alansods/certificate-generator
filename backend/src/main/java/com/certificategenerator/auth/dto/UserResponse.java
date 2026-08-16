package com.certificategenerator.auth.dto;

import com.certificategenerator.auth.Role;

public record UserResponse(Long id, String email, String fullName, Role role) {}
