package com.certificategenerator.certificate;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.Role;
import com.certificategenerator.auth.User;
import com.certificategenerator.auth.UserRepository;
import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
import com.certificategenerator.certificate.dto.CertificateRequest;
import com.certificategenerator.certificate.dto.CertificateResponse;
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
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class CertificateIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@example.com";
    private static final String ADMIN_PASSWORD = "changeme123";
    private static final String OTHER_USER_EMAIL = "staff@example.com";
    private static final String OTHER_USER_PASSWORD = "staff-password-123";

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void createReturnsCreatedCertificateWithGeneratedCode() {
        ResponseEntity<CertificateResponse> response = createCertificate(adminAuth());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().code()).matches("CERT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}");
        assertThat(response.getBody().status()).isEqualTo(CertificateStatus.DRAFT);
    }

    @Test
    void createWithMissingFieldReturns400WithFieldErrors() {
        String body =
                "{\"recipientName\":\"\",\"recipientEmail\":\"jane@example.com\",\"courseName\":\"Course\","
                        + "\"workloadHours\":10,\"completionDate\":\"2026-01-01\",\"issueDate\":\"2026-01-02\","
                        + "\"instructorName\":\"John\",\"template\":\"CLASSIC\"}";
        HttpHeaders headers = adminAuth();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        "/api/v1/certificates", new HttpEntity<>(body, headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).contains("fieldErrors");
    }

    @Test
    void getReturnsTheCertificateAndUnknownIdReturns404() {
        CertificateResponse created = createCertificate(adminAuth()).getBody();

        ResponseEntity<CertificateResponse> found =
                restTemplate.exchange(
                        "/api/v1/certificates/" + created.id(),
                        HttpMethod.GET,
                        new HttpEntity<>(adminAuth()),
                        CertificateResponse.class);
        assertThat(found.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(found.getBody().code()).isEqualTo(created.code());

        ResponseEntity<String> notFound =
                restTemplate.exchange(
                        "/api/v1/certificates/999999999",
                        HttpMethod.GET,
                        new HttpEntity<>(adminAuth()),
                        String.class);
        assertThat(notFound.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void updateReplacesTheStoredFields() {
        CertificateResponse created = createCertificate(adminAuth()).getBody();
        CertificateRequest update =
                new CertificateRequest(
                        "Updated Name",
                        "updated@example.com",
                        "Updated Course",
                        20,
                        LocalDate.of(2026, 2, 1),
                        LocalDate.of(2026, 2, 2),
                        "Updated Instructor",
                        CertificateTemplate.MODERN,
                        CertificateStatus.ISSUED);

        ResponseEntity<CertificateResponse> response =
                restTemplate.exchange(
                        "/api/v1/certificates/" + created.id(),
                        HttpMethod.PUT,
                        new HttpEntity<>(update, adminAuth()),
                        CertificateResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().recipientName()).isEqualTo("Updated Name");
        assertThat(response.getBody().status()).isEqualTo(CertificateStatus.ISSUED);
        assertThat(response.getBody().code()).isEqualTo(created.code());
    }

    @Test
    void anyAuthenticatedUserCanReadAndUpdateAnotherUsersCertificate() {
        CertificateResponse created = createCertificate(adminAuth()).getBody();
        HttpHeaders otherUserAuth = otherUserAuth();

        ResponseEntity<CertificateResponse> read =
                restTemplate.exchange(
                        "/api/v1/certificates/" + created.id(),
                        HttpMethod.GET,
                        new HttpEntity<>(otherUserAuth),
                        CertificateResponse.class);
        assertThat(read.getStatusCode()).isEqualTo(HttpStatus.OK);

        CertificateRequest update = sampleRequest(CertificateStatus.ISSUED);
        ResponseEntity<CertificateResponse> updated =
                restTemplate.exchange(
                        "/api/v1/certificates/" + created.id(),
                        HttpMethod.PUT,
                        new HttpEntity<>(update, otherUserAuth),
                        CertificateResponse.class);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void nonAdminCannotDeleteButAdminCan() {
        CertificateResponse created = createCertificate(adminAuth()).getBody();

        ResponseEntity<String> deniedForUser =
                restTemplate.exchange(
                        "/api/v1/certificates/" + created.id(),
                        HttpMethod.DELETE,
                        new HttpEntity<>(otherUserAuth()),
                        String.class);
        assertThat(deniedForUser.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<Void> deletedByAdmin =
                restTemplate.exchange(
                        "/api/v1/certificates/" + created.id(),
                        HttpMethod.DELETE,
                        new HttpEntity<>(adminAuth()),
                        Void.class);
        assertThat(deletedByAdmin.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> nowMissing =
                restTemplate.exchange(
                        "/api/v1/certificates/" + created.id(),
                        HttpMethod.GET,
                        new HttpEntity<>(adminAuth()),
                        String.class);
        assertThat(nowMissing.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void searchFiltersByQueryAndStatusAndPaginates() {
        String uniqueMarker = "Zephyr" + System.nanoTime();
        HttpHeaders auth = adminAuth();
        ResponseEntity<CertificateResponse> matching =
                restTemplate.postForEntity(
                        "/api/v1/certificates",
                        new HttpEntity<>(
                                new CertificateRequest(
                                        uniqueMarker,
                                        "match@example.com",
                                        "Course",
                                        10,
                                        LocalDate.of(2026, 1, 1),
                                        LocalDate.of(2026, 1, 2),
                                        "Instructor",
                                        CertificateTemplate.CLASSIC,
                                        CertificateStatus.ISSUED),
                                auth),
                        CertificateResponse.class);
        assertThat(matching.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        createCertificate(auth); // an unrelated certificate that must not match the search below

        ResponseEntity<String> searchResponse =
                restTemplate.exchange(
                        "/api/v1/certificates?q=" + uniqueMarker + "&status=ISSUED&page=0&size=10",
                        HttpMethod.GET,
                        new HttpEntity<>(auth),
                        String.class);

        assertThat(searchResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(searchResponse.getBody()).contains(uniqueMarker);
        assertThat(searchResponse.getBody()).contains("\"totalElements\"");
    }

    @Test
    void everyEndpointRejectsAnonymousRequests() {
        CertificateResponse created = createCertificate(adminAuth()).getBody();

        assertThat(
                        restTemplate
                                .postForEntity(
                                        "/api/v1/certificates", new HttpEntity<>(sampleRequest(null)), String.class)
                                .getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        assertThat(restTemplate.getForEntity("/api/v1/certificates", String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        assertThat(
                        restTemplate
                                .getForEntity("/api/v1/certificates/" + created.id(), String.class)
                                .getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        assertThat(
                        restTemplate
                                .exchange(
                                        "/api/v1/certificates/" + created.id(),
                                        HttpMethod.PUT,
                                        new HttpEntity<>(sampleRequest(null)),
                                        String.class)
                                .getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        assertThat(
                        restTemplate
                                .exchange(
                                        "/api/v1/certificates/" + created.id(),
                                        HttpMethod.DELETE,
                                        HttpEntity.EMPTY,
                                        String.class)
                                .getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private ResponseEntity<CertificateResponse> createCertificate(HttpHeaders auth) {
        return restTemplate.postForEntity(
                "/api/v1/certificates",
                new HttpEntity<>(sampleRequest(null), auth),
                CertificateResponse.class);
    }

    private static CertificateRequest sampleRequest(CertificateStatus status) {
        return new CertificateRequest(
                "Jane Doe",
                "jane@example.com",
                "Advanced Angular",
                40,
                LocalDate.of(2026, 5, 12),
                LocalDate.of(2026, 5, 15),
                "John Smith",
                CertificateTemplate.CLASSIC,
                status);
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
