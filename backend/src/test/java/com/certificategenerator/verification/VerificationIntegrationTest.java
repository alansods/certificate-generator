package com.certificategenerator.verification;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

/**
 * Exercises public-verification end to end against a real Testcontainers Postgres, with no
 * Authorization header on any request — confirming SecurityConfig's permitAll wiring, not just
 * the controller's own logic. Rate-limit-exceeded is covered separately by
 * {@link VerificationRateLimitIntegrationTest}, in its own Spring context with a lowered
 * threshold, so it doesn't share a rate-limit bucket with (or get consumed by) the requests made
 * here.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class VerificationIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@example.com";
    private static final String ADMIN_PASSWORD = "changeme123";

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private CertificateRepository certificateRepository;

    @Test
    void verifyExistingCodeReturns200WithMinimalBodyAndNoAuthHeader() {
        Certificate certificate = certificateRepository.save(sampleCertificate("CERT-VER1-0001", CertificateStatus.ISSUED));

        ResponseEntity<String> response =
                restTemplate.getForEntity("/api/v1/public/verify/" + certificate.getCode(), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"recipientName\":\"Jane Doe\"");
        assertThat(response.getBody()).doesNotContain("recipientEmail");
        assertThat(response.getBody()).doesNotContain("\"id\"");
    }

    @Test
    void verifyRevokedCodeReturns200WithRevokedStatus() {
        Certificate certificate = certificateRepository.save(sampleCertificate("CERT-VER2-0002", CertificateStatus.REVOKED));

        ResponseEntity<String> response =
                restTemplate.getForEntity("/api/v1/public/verify/" + certificate.getCode(), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"REVOKED\"");
    }

    @Test
    void verifyUnknownCodeReturns404WithProblemDetail() {
        ResponseEntity<ProblemDetail> response =
                restTemplate.getForEntity("/api/v1/public/verify/CERT-NONE-0000", ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().getProperties()).containsKey("traceId");
    }

    @Test
    void verifyAlsoSucceedsForAnAuthenticatedCaller() {
        Certificate certificate = certificateRepository.save(sampleCertificate("CERT-VER4-0004", CertificateStatus.ISSUED));
        ResponseEntity<TokenPairResponse> login =
                restTemplate.postForEntity(
                        "/api/v1/auth/login",
                        new LoginRequest(ADMIN_EMAIL, ADMIN_PASSWORD),
                        TokenPairResponse.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(login.getBody().accessToken());

        ResponseEntity<String> response =
                restTemplate.exchange(
                        "/api/v1/public/verify/" + certificate.getCode(),
                        HttpMethod.GET,
                        new HttpEntity<>(headers),
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private static Certificate sampleCertificate(String code, CertificateStatus status) {
        return new Certificate(
                code,
                "Jane Doe",
                "jane@example.com",
                "Advanced Angular",
                40,
                LocalDate.of(2026, 5, 12),
                LocalDate.of(2026, 5, 15),
                "John Smith",
                CertificateTemplate.CLASSIC,
                status,
                1L);
    }
}
