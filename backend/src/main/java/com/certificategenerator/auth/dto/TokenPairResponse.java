package com.certificategenerator.auth.dto;

public record TokenPairResponse(String accessToken, String refreshToken, long expiresIn) {}
