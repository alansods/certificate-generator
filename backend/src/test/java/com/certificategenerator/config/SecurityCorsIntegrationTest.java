package com.certificategenerator.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
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

/**
 * Regression coverage for a real bug: SecurityConfig never called http.cors(...), so Spring
 * Security rejected every CORS preflight (OPTIONS) request with 401 before Spring MVC's own
 * CorsConfig ever ran — invisible to CorsConfigTest and CertificateControllerTest, both of which
 * deliberately exclude Spring Security's autoconfiguration to test their own concern in
 * isolation. Only a real end-to-end request through the full filter chain (this test) exercises
 * the actual combination that was broken.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class SecurityCorsIntegrationTest {

    @Autowired private TestRestTemplate restTemplate;

    @Test
    void preflightForAProtectedEndpointSucceedsWithoutAuthentication() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.ORIGIN, "http://localhost:4200");
        headers.set(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET");
        headers.set(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization");

        ResponseEntity<Void> response =
                restTemplate.exchange(
                        "/api/v1/certificates",
                        HttpMethod.OPTIONS,
                        new HttpEntity<>(headers),
                        Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin())
                .isEqualTo("http://localhost:4200");
    }

    @Test
    void theActualRequestStillRequiresAuthenticationAfterEnablingCors() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.ORIGIN, "http://localhost:4200");

        ResponseEntity<String> response =
                restTemplate.exchange(
                        "/api/v1/certificates",
                        HttpMethod.GET,
                        new HttpEntity<>(headers),
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
