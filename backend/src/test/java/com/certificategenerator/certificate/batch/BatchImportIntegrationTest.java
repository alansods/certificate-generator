package com.certificategenerator.certificate.batch;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.Role;
import com.certificategenerator.auth.User;
import com.certificategenerator.auth.UserRepository;
import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
import com.certificategenerator.certificate.batch.dto.BatchImportResponse;
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
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class BatchImportIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@example.com";
    private static final String ADMIN_PASSWORD = "changeme123";
    private static final String OTHER_USER_EMAIL = "staff@example.com";
    private static final String OTHER_USER_PASSWORD = "staff-password-123";
    private static final String HEADER =
            "recipient_name,recipient_email,course_name,workload_hours,completion_date,issue_date,instructor_name,template";

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void authenticatedUploadWithMixedRowsCreatesOnlyValidRowsAndReportsErrors() {
        String csv =
                HEADER
                        + "\n"
                        + "Jane Doe,jane@example.com,Advanced Angular,40,2026-05-12,2026-05-15,John Smith,CLASSIC\n"
                        + ",jane@example.com,Advanced Angular,40,2026-05-12,2026-05-15,John Smith,CLASSIC\n"
                        + "John Roe,john@example.com,Advanced Angular,40,2026-05-12,2026-05-15,John Smith,CLASSIC";

        ResponseEntity<BatchImportResponse> response = upload(csv, adminAuth());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().totalRows()).isEqualTo(3);
        assertThat(response.getBody().successCount()).isEqualTo(2);
        assertThat(response.getBody().errorCount()).isEqualTo(1);
        assertThat(response.getBody().errors().get(0).line()).isEqualTo(3);
    }

    @Test
    void nonAdminAuthenticatedUploadAlsoSucceeds() {
        String csv = HEADER + "\nJane Doe,jane@example.com,Advanced Angular,40,2026-05-12,2026-05-15,John Smith,CLASSIC";

        ResponseEntity<BatchImportResponse> response = upload(csv, otherUserAuth());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().successCount()).isEqualTo(1);
    }

    @Test
    void mismatchedHeaderReturns400WithNothingCreated() {
        String csv =
                "recipient_name,course_name,recipient_email,workload_hours,completion_date,issue_date,instructor_name,template"
                        + "\nJane Doe,Advanced Angular,jane@example.com,40,2026-05-12,2026-05-15,John Smith,CLASSIC";

        ResponseEntity<ProblemDetail> response = upload(csv, adminAuth(), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void anonymousUploadReturns401() {
        String csv = HEADER + "\nJane Doe,jane@example.com,Advanced Angular,40,2026-05-12,2026-05-15,John Smith,CLASSIC";

        ResponseEntity<String> response = upload(csv, new HttpHeaders(), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void exceedingMaxRowsReturns400WithNothingCreated() {
        StringBuilder csv = new StringBuilder(HEADER);
        for (int i = 0; i < 501; i++) {
            csv.append("\nJane Doe,jane@example.com,Advanced Angular,40,2026-05-12,2026-05-15,John Smith,CLASSIC");
        }

        ResponseEntity<ProblemDetail> response =
                upload(csv.toString(), adminAuth(), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void templateDownloadReturnsExactDocumentedHeader() {
        ResponseEntity<String> response =
                restTemplate.exchange(
                        "/api/v1/certificates/batch/template.csv",
                        HttpMethod.GET,
                        new HttpEntity<>(adminAuth()),
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().trim()).isEqualTo(HEADER);
    }

    private ResponseEntity<BatchImportResponse> upload(String csv, HttpHeaders authHeaders) {
        return upload(csv, authHeaders, BatchImportResponse.class);
    }

    private <T> ResponseEntity<T> upload(String csv, HttpHeaders authHeaders, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.putAll(authHeaders);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add(
                "file",
                new ByteArrayResource(csv.getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
                    @Override
                    public String getFilename() {
                        return "batch.csv";
                    }
                });

        return restTemplate.postForEntity(
                "/api/v1/certificates/batch", new HttpEntity<>(body, headers), responseType);
    }

    private HttpHeaders adminAuth() {
        return bearerHeaders(login(ADMIN_EMAIL, ADMIN_PASSWORD).accessToken());
    }

    private HttpHeaders otherUserAuth() {
        userRepository
                .findByEmail(OTHER_USER_EMAIL)
                .orElseGet(
                        () ->
                                userRepository.save(
                                        new User(
                                                OTHER_USER_EMAIL,
                                                passwordEncoder.encode(OTHER_USER_PASSWORD),
                                                "Staff Member",
                                                Role.USER)));
        return bearerHeaders(login(OTHER_USER_EMAIL, OTHER_USER_PASSWORD).accessToken());
    }

    private TokenPairResponse login(String email, String password) {
        ResponseEntity<TokenPairResponse> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/login", new LoginRequest(email, password), TokenPairResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private static HttpHeaders bearerHeaders(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return headers;
    }
}
