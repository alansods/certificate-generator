package com.certificategenerator.certificate;

import com.certificategenerator.certificate.dto.CertificateResponse;
import org.springframework.stereotype.Component;

@Component
public class CertificateMapper {

    public CertificateResponse toResponse(Certificate certificate) {
        return new CertificateResponse(
                certificate.getId(),
                certificate.getCode(),
                certificate.getRecipientName(),
                certificate.getRecipientEmail(),
                certificate.getCourseName(),
                certificate.getWorkloadHours(),
                certificate.getCompletionDate(),
                certificate.getIssueDate(),
                certificate.getInstructorName(),
                certificate.getTemplate(),
                certificate.getStatus(),
                certificate.getCreatedBy(),
                certificate.getCreatedAt(),
                certificate.getUpdatedAt());
    }
}
