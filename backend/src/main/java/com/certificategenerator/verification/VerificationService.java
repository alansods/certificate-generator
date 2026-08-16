package com.certificategenerator.verification;

import com.certificategenerator.certificate.Certificate;
import com.certificategenerator.certificate.CertificateRepository;
import com.certificategenerator.verification.dto.CertificateVerificationResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VerificationService {

    private final CertificateRepository certificateRepository;

    public VerificationService(CertificateRepository certificateRepository) {
        this.certificateRepository = certificateRepository;
    }

    @Transactional(readOnly = true)
    public CertificateVerificationResponse verify(String code) {
        Certificate certificate =
                certificateRepository
                        .findByCode(code)
                        .orElseThrow(() -> new CertificateVerificationNotFoundException(code));
        return new CertificateVerificationResponse(
                certificate.getRecipientName(),
                certificate.getCourseName(),
                certificate.getWorkloadHours(),
                certificate.getIssueDate(),
                certificate.getStatus());
    }
}
