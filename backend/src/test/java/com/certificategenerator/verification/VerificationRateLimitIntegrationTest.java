package com.certificategenerator.verification;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.certificate.Certificate;
import com.certificategenerator.certificate.CertificateRepository;
import com.certificategenerator.certificate.CertificateStatus;
import com.certificategenerator.certificate.CertificateTemplate;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

/**
 * Isolated in its own Spring context (distinct property override) so its low
 * app.rate-limit.verify.max-attempts threshold can't be affected by, or consume the budget
 * needed by, {@link VerificationIntegrationTest}'s requests sharing the same loopback IP.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@TestPropertySource(properties = "app.rate-limit.verify.max-attempts=3")
class VerificationRateLimitIntegrationTest {

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private CertificateRepository certificateRepository;

    @Test
    void exceedingRateLimitReturns429() {
        Certificate certificate =
                certificateRepository.save(
                        new Certificate(
                                "CERT-VER9-0009",
                                "Jane Doe",
                                "jane@example.com",
                                "Advanced Angular",
                                40,
                                LocalDate.of(2026, 5, 12),
                                LocalDate.of(2026, 5, 15),
                                "John Smith",
                                CertificateTemplate.CLASSIC,
                                CertificateStatus.ISSUED,
                                1L));
        String url = "/api/v1/public/verify/" + certificate.getCode();

        for (int i = 0; i < 3; i++) {
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        }

        ResponseEntity<String> blocked = restTemplate.getForEntity(url, String.class);
        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }
}
