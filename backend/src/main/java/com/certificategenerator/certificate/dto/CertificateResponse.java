package com.certificategenerator.certificate.dto;

import com.certificategenerator.certificate.CertificateStatus;
import com.certificategenerator.certificate.CertificateTemplate;
import java.time.Instant;
import java.time.LocalDate;

public record CertificateResponse(
        Long id,
        String code,
        String recipientName,
        String recipientEmail,
        String courseName,
        Integer workloadHours,
        LocalDate completionDate,
        LocalDate issueDate,
        String instructorName,
        CertificateTemplate template,
        CertificateStatus status,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt) {}
