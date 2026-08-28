package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.dto.RegisterRequest;
import com.certificategenerator.auth.dto.RegistrationStatusResponse;
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
 * Isolated in its own Spring context (distinct property override, forcing a distinct
 * ApplicationContext from {@link RegisterIntegrationTest}) so a disabled flag here can't leak
 * into unrelated tests.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@TestPropertySource(properties = "app.auth.registration-enabled=false")
class RegistrationDisabledIntegrationTest {

    @Autowired private TestRestTemplate restTemplate;

    @Test
    void registerReturns404WhenDisabled() {
        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/register",
                        new RegisterRequest("New User", "disabled-signup@example.com", "correct-horse1"),
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void registrationEnabledReportsFalseWhenDisabled() {
        ResponseEntity<RegistrationStatusResponse> response =
                restTemplate.getForEntity(
                        "/api/v1/auth/registration-enabled", RegistrationStatusResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().enabled()).isFalse();
    }
}
