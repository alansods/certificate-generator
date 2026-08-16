package com.certificategenerator.certificate.dto;

import com.certificategenerator.certificate.CertificateStatus;
import com.certificategenerator.certificate.CertificateTemplate;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

public record CertificateRequest(
        @NotBlank String recipientName,
        @NotBlank @Email String recipientEmail,
        @NotBlank String courseName,
        @NotNull @Positive Integer workloadHours,
        @NotNull LocalDate completionDate,
        @NotNull LocalDate issueDate,
        @NotBlank String instructorName,
        @NotNull CertificateTemplate template,
        // Optional: omitted on create defaults to DRAFT, per design.md — not listed among the
        // spec's required fields, unlike every other field here.
        CertificateStatus status) {}
