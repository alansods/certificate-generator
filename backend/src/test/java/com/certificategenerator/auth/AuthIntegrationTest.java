package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.RefreshRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
import com.certificategenerator.auth.dto.UserResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Exercises the auth capability end to end against a real Testcontainers Postgres, using the
 * bootstrap admin seeded by {@link AdminBootstrapRunner} from application-dev.yml's
 * app.admin-bootstrap.* values (test defaults, not real credentials).
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class AuthIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@example.com";
    private static final String ADMIN_PASSWORD = "changeme123";

    @Autowired private TestRestTemplate restTemplate;

    @Test
    void loginSucceedsAndReturnsAdminProfileViaMe() {
        TokenPairResponse tokens = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        ResponseEntity<UserResponse> me =
                restTemplate.exchange(
                        "/api/v1/auth/me",
                        org.springframework.http.HttpMethod.GET,
                        authorizedEntity(tokens.accessToken()),
                        UserResponse.class);

        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody().email()).isEqualTo(ADMIN_EMAIL);
        assertThat(me.getBody().role()).isEqualTo(Role.ADMIN);
    }

    @Test
    void loginWithWrongPasswordReturns401() {
        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/login",
                        new LoginRequest(ADMIN_EMAIL, "wrong-password"),
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void meWithoutTokenReturns401() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/v1/auth/me", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refreshRotatesTheTokenAndInvalidatesThePrevious() {
        TokenPairResponse original = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        ResponseEntity<TokenPairResponse> refreshed =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh",
                        new RefreshRequest(original.refreshToken()),
                        TokenPairResponse.class);
        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(refreshed.getBody().refreshToken()).isNotEqualTo(original.refreshToken());

        ResponseEntity<String> reuseOriginal =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh", new RefreshRequest(original.refreshToken()), String.class);
        assertThat(reuseOriginal.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void reusingARevokedRefreshTokenRevokesTheWholeFamily() {
        TokenPairResponse pair1 = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        ResponseEntity<TokenPairResponse> pair2Response =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh", new RefreshRequest(pair1.refreshToken()), TokenPairResponse.class);
        String refresh2 = pair2Response.getBody().refreshToken();

        // Reusing the already-rotated first token is the theft signal.
        ResponseEntity<String> reuseAttempt =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh", new RefreshRequest(pair1.refreshToken()), String.class);
        assertThat(reuseAttempt.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // The whole family — including the not-yet-expired refresh2 — must now be revoked too.
        ResponseEntity<String> attemptWithRefresh2 =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh", new RefreshRequest(refresh2), String.class);
        assertThat(attemptWithRefresh2.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logoutRevokesTheRefreshToken() {
        TokenPairResponse tokens = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(tokens.accessToken());
        HttpEntity<RefreshRequest> logoutRequest =
                new HttpEntity<>(new RefreshRequest(tokens.refreshToken()), headers);
        ResponseEntity<Void> logoutResponse =
                restTemplate.postForEntity("/api/v1/auth/logout", logoutRequest, Void.class);
        assertThat(logoutResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> refreshAfterLogout =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh", new RefreshRequest(tokens.refreshToken()), String.class);
        assertThat(refreshAfterLogout.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logoutRevokesTheRefreshTokenWithoutAnAccessToken() {
        // The refresh token in the body is the credential. Requiring a bearer as well meant an
        // expired one sent logout through the client's silent-refresh retry, which rotates the
        // refresh token and then revokes the superseded one, leaving the live token usable.
        TokenPairResponse tokens = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        ResponseEntity<Void> logoutResponse =
                restTemplate.postForEntity(
                        "/api/v1/auth/logout", new RefreshRequest(tokens.refreshToken()), Void.class);
        assertThat(logoutResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> refreshAfterLogout =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh", new RefreshRequest(tokens.refreshToken()), String.class);
        assertThat(refreshAfterLogout.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void logoutOfAnUnknownTokenReportsSuccessAndAffectsNoSession() {
        TokenPairResponse tokens = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        ResponseEntity<Void> logoutResponse =
                restTemplate.postForEntity(
                        "/api/v1/auth/logout", new RefreshRequest("not-a-stored-token"), Void.class);
        assertThat(logoutResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> stillValid =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh", new RefreshRequest(tokens.refreshToken()), String.class);
        assertThat(stillValid.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void loginIsRateLimitedAfterFiveFailedAttemptsForTheSameEmail() {
        String email = "rate-limit-probe@example.com"; // isolated from the shared admin key

        for (int i = 0; i < 5; i++) {
            ResponseEntity<String> attempt =
                    restTemplate.postForEntity(
                            "/api/v1/auth/login", new LoginRequest(email, "wrong"), String.class);
            assertThat(attempt.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        ResponseEntity<String> sixthAttempt =
                restTemplate.postForEntity(
                        "/api/v1/auth/login", new LoginRequest(email, "wrong"), String.class);
        assertThat(sixthAttempt.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void concurrentRotationOfTheSameTokenSucceedsExactlyOnce() throws Exception {
        TokenPairResponse tokens = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var rotate =
                    (java.util.concurrent.Callable<org.springframework.http.HttpStatusCode>)
                            () ->
                                    restTemplate
                                            .postForEntity(
                                                    "/api/v1/auth/refresh",
                                                    new RefreshRequest(tokens.refreshToken()),
                                                    String.class)
                                            .getStatusCode();

            var future1 = executor.submit(rotate);
            var future2 = executor.submit(rotate);
            org.springframework.http.HttpStatusCode status1 = future1.get();
            org.springframework.http.HttpStatusCode status2 = future2.get();

            long successes =
                    java.util.stream.Stream.of(status1, status2)
                            .filter(status -> status.equals(HttpStatus.OK))
                            .count();
            assertThat(successes)
                    .as("exactly one concurrent rotation of the same token should win: %s, %s", status1, status2)
                    .isEqualTo(1);
        } finally {
            executor.shutdown();
        }
    }

    private TokenPairResponse login(String email, String password) {
        ResponseEntity<TokenPairResponse> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/login", new LoginRequest(email, password), TokenPairResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private static HttpEntity<Void> authorizedEntity(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return new HttpEntity<>(headers);
    }
}
