package com.certificategenerator.verification.dto;

import com.certificategenerator.certificate.CertificateStatus;
import java.time.LocalDate;

public record CertificateVerificationResponse(
        String recipientName,
        String courseName,
        Integer workloadHours,
        LocalDate issueDate,
        CertificateStatus status) {}
