package com.certificategenerator.verification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.certificategenerator.certificate.Certificate;
import com.certificategenerator.certificate.CertificateRepository;
import com.certificategenerator.certificate.CertificateStatus;
import com.certificategenerator.certificate.CertificateTemplate;
import com.certificategenerator.verification.dto.CertificateVerificationResponse;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VerificationServiceTest {

    @Mock private CertificateRepository certificateRepository;

    private VerificationService service;

    @BeforeEach
    void setUp() {
        service = new VerificationService(certificateRepository);
    }

    @Test
    void verifyReturnsMinimalResponseForActiveCertificate() {
        when(certificateRepository.findByCode("CERT-AAAA-BBBB"))
                .thenReturn(Optional.of(sampleCertificate(CertificateStatus.ISSUED)));

        CertificateVerificationResponse response = service.verify("CERT-AAAA-BBBB");

        assertThat(response.recipientName()).isEqualTo("Jane Doe");
        assertThat(response.courseName()).isEqualTo("Advanced Angular");
        assertThat(response.workloadHours()).isEqualTo(40);
        assertThat(response.issueDate()).isEqualTo(LocalDate.of(2026, 5, 15));
        assertThat(response.status()).isEqualTo(CertificateStatus.ISSUED);
    }

    @Test
    void verifyReturnsRevokedStatusRatherThanNotFound() {
        when(certificateRepository.findByCode("CERT-AAAA-BBBB"))
                .thenReturn(Optional.of(sampleCertificate(CertificateStatus.REVOKED)));

        CertificateVerificationResponse response = service.verify("CERT-AAAA-BBBB");

        assertThat(response.status()).isEqualTo(CertificateStatus.REVOKED);
    }

    @Test
    void verifyThrowsNotFoundForUnknownCode() {
        when(certificateRepository.findByCode("CERT-ZZZZ-ZZZZ")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verify("CERT-ZZZZ-ZZZZ"))
                .isInstanceOf(CertificateVerificationNotFoundException.class);
    }

    private static Certificate sampleCertificate(CertificateStatus status) {
        return new Certificate(
                "CERT-AAAA-BBBB",
                "Jane Doe",
                "jane@example.com",
                "Advanced Angular",
                40,
                LocalDate.of(2026, 5, 12),
                LocalDate.of(2026, 5, 15),
                "John Smith",
                CertificateTemplate.CLASSIC,
                status,
                7L);
    }
}
