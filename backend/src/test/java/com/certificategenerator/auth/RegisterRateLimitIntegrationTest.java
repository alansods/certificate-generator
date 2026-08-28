package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.dto.RegisterRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
import java.util.concurrent.atomic.AtomicInteger;
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
 * app.rate-limit.register.max-attempts threshold can't collide with, or consume the budget needed
 * by, {@link RegisterIntegrationTest}'s own register calls sharing the same loopback IP.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@TestPropertySource(properties = "app.rate-limit.register.max-attempts=3")
class RegisterRateLimitIntegrationTest {

    private static final AtomicInteger COUNTER = new AtomicInteger();

    @Autowired private TestRestTemplate restTemplate;

    @Test
    void exceedingRateLimitReturns429() {
        for (int i = 0; i < 3; i++) {
            ResponseEntity<TokenPairResponse> response =
                    restTemplate.postForEntity(
                            "/api/v1/auth/register",
                            new RegisterRequest("New User", nextEmail(), "correct-horse1"),
                            TokenPairResponse.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        }

        ResponseEntity<String> blocked =
                restTemplate.postForEntity(
                        "/api/v1/auth/register",
                        new RegisterRequest("New User", nextEmail(), "correct-horse1"),
                        String.class);
        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    private static String nextEmail() {
        return "register-rate-limit-" + COUNTER.incrementAndGet() + "@example.com";
    }
}
