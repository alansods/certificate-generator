package com.certificategenerator.auth.reset;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.dto.ForgotPasswordRequest;
import com.certificategenerator.auth.dto.ResetPasswordRequest;
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
 * Isolated in its own Spring context (distinct property overrides, forcing a distinct
 * ApplicationContext from {@link PasswordResetIntegrationTest}) so a tiny rate-limit threshold
 * here can't collide with that class's own requests sharing the same loopback IP.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@TestPropertySource(
        properties = {
            "app.rate-limit.password-reset-request-ip.max-attempts=3",
            "app.rate-limit.password-reset-request-email.max-attempts=2",
            "app.rate-limit.password-reset-complete.max-attempts=3"
        })
class PasswordResetRateLimitIntegrationTest {

    @Autowired private TestRestTemplate restTemplate;

    @Test
    void exceedingTheRequestLimitFromOneIpReturns429() {
        for (int i = 0; i < 3; i++) {
            restTemplate.postForEntity(
                    "/api/v1/auth/forgot-password",
                    new ForgotPasswordRequest("ip-probe-" + i + "@example.com"),
                    Void.class);
        }

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/forgot-password",
                        new ForgotPasswordRequest("ip-probe-final@example.com"),
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void exceedingTheRequestLimitForOneEmailReturns429() {
        String email = "email-probe@example.com";
        for (int i = 0; i < 2; i++) {
            restTemplate.postForEntity("/api/v1/auth/forgot-password", new ForgotPasswordRequest(email), Void.class);
        }

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/forgot-password", new ForgotPasswordRequest(email), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void exceedingTheCompletionLimitFromOneIpReturns429() {
        for (int i = 0; i < 3; i++) {
            restTemplate.postForEntity(
                    "/api/v1/auth/reset-password", new ResetPasswordRequest("bad-token", "brand-new1"), String.class);
        }

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/reset-password", new ResetPasswordRequest("bad-token", "brand-new1"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }
}
