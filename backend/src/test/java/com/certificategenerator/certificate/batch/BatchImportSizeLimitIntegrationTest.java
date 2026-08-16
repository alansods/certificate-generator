package com.certificategenerator.certificate.batch;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Isolated in its own Spring context (distinct property override, forcing a distinct
 * ApplicationContext from {@link BatchImportIntegrationTest}) so a tiny multipart size limit here
 * can't leak into unrelated tests.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@TestPropertySource(properties = "spring.servlet.multipart.max-file-size=1KB")
class BatchImportSizeLimitIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@example.com";
    private static final String ADMIN_PASSWORD = "changeme123";

    @Autowired private TestRestTemplate restTemplate;

    @Test
    void oversizedFileReturns413WithNothingCreated() {
        StringBuilder csv =
                new StringBuilder(
                        "recipient_name,recipient_email,course_name,workload_hours,completion_date,issue_date,instructor_name,template");
        for (int i = 0; i < 100; i++) {
            csv.append("\nJane Doe,jane@example.com,Advanced Angular,40,2026-05-12,2026-05-15,John Smith,CLASSIC");
        }

        HttpHeaders headers = adminAuth();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add(
                "file",
                new ByteArrayResource(csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
                    @Override
                    public String getFilename() {
                        return "batch.csv";
                    }
                });

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        "/api/v1/certificates/batch", new HttpEntity<>(body, headers), String.class);

        assertThat(response.getStatusCode().value()).isEqualTo(413);
    }

    private HttpHeaders adminAuth() {
        ResponseEntity<TokenPairResponse> login =
                restTemplate.postForEntity(
                        "/api/v1/auth/login",
                        new LoginRequest(ADMIN_EMAIL, ADMIN_PASSWORD),
                        TokenPairResponse.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(login.getBody().accessToken());
        return headers;
    }
}
