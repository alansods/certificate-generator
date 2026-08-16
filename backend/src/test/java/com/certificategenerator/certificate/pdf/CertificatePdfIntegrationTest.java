package com.certificategenerator.certificate.pdf;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
import com.certificategenerator.certificate.CertificateStatus;
import com.certificategenerator.certificate.CertificateTemplate;
import com.certificategenerator.certificate.dto.CertificateRequest;
import com.certificategenerator.certificate.dto.CertificateResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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
import org.springframework.http.ResponseEntity;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class CertificatePdfIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@example.com";
    private static final String ADMIN_PASSWORD = "changeme123";

    @Autowired private TestRestTemplate restTemplate;

    @ParameterizedTest
    @EnumSource(CertificateTemplate.class)
    void downloadsAOnePageSelfContainedPdfForEveryTemplate(CertificateTemplate template)
            throws Exception {
        HttpHeaders auth = adminAuth();
        CertificateResponse created = createCertificate(auth, template).getBody();

        ResponseEntity<byte[]> response =
                restTemplate.exchange(
                        "/api/v1/certificates/" + created.id() + "/pdf",
                        HttpMethod.GET,
                        new HttpEntity<>(auth),
                        byte[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("application/pdf");
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .contains("attachment")
                .contains(created.code());

        byte[] pdf = response.getBody();
        assertThat(new String(pdf, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("%PDF");

        try (PDDocument document = PDDocument.load(pdf)) {
            assertThat(document.getNumberOfPages()).isEqualTo(1);
            String text = new PDFTextStripper().getText(document);
            assertThat(text).contains("Jane Doe").contains("Advanced Angular");
        }
    }

    @Test
    void unknownCertificateReturns404() {
        HttpHeaders auth = adminAuth();

        ResponseEntity<String> response =
                restTemplate.exchange(
                        "/api/v1/certificates/999999999/pdf",
                        HttpMethod.GET,
                        new HttpEntity<>(auth),
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void anonymousRequestReturns401() {
        HttpHeaders auth = adminAuth();
        CertificateResponse created = createCertificate(auth, CertificateTemplate.CLASSIC).getBody();

        ResponseEntity<String> response =
                restTemplate.getForEntity(
                        "/api/v1/certificates/" + created.id() + "/pdf", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private ResponseEntity<CertificateResponse> createCertificate(
            HttpHeaders auth, CertificateTemplate template) {
        CertificateRequest request =
                new CertificateRequest(
                        "Jane Doe",
                        "jane@example.com",
                        "Advanced Angular",
                        40,
                        LocalDate.of(2026, 5, 12),
                        LocalDate.of(2026, 5, 15),
                        "John Smith",
                        template,
                        CertificateStatus.ISSUED);
        return restTemplate.postForEntity(
                "/api/v1/certificates", new HttpEntity<>(request, auth), CertificateResponse.class);
    }

    private HttpHeaders adminAuth() {
        ResponseEntity<TokenPairResponse> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/login",
                        new LoginRequest(ADMIN_EMAIL, ADMIN_PASSWORD),
                        TokenPairResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(response.getBody().accessToken());
        return headers;
    }
}
