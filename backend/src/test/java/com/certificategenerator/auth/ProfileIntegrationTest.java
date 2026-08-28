package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.dto.ChangePasswordRequest;
import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.RefreshRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
import com.certificategenerator.auth.dto.UpdateProfileRequest;
import com.certificategenerator.auth.dto.UserResponse;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Exercises PUT /api/v1/auth/me and POST /api/v1/auth/me/password end to end. Each test creates
 * its own user directly through the repository rather than touching the shared bootstrap admin
 * that {@link AuthIntegrationTest} relies on — the DB and Spring context are shared across the
 * whole suite, so mutating that account here would make those tests order-dependent.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class ProfileIntegrationTest {

    private static final String PASSWORD = "correct-horse1";
    private static final AtomicInteger COUNTER = new AtomicInteger();

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void validProfileUpdateReturns200AndPersists() {
        Session session = newUser();

        ResponseEntity<UserResponse> response =
                exchange(
                        HttpMethod.PUT,
                        "/api/v1/auth/me",
                        new UpdateProfileRequest("New Name", session.email + ".updated"),
                        session.accessToken,
                        UserResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().fullName()).isEqualTo("New Name");
        assertThat(response.getBody().email()).isEqualTo(session.email + ".updated");
        assertThat(userRepository.findById(session.userId).orElseThrow().getFullName())
                .isEqualTo("New Name");
    }

    @Test
    void emailBelongingToAnotherUserReturns409AndModifiesNeitherUser() {
        Session first = newUser();
        Session second = newUser();

        ResponseEntity<String> response =
                exchange(
                        HttpMethod.PUT,
                        "/api/v1/auth/me",
                        new UpdateProfileRequest("New Name", second.email),
                        first.accessToken,
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(userRepository.findById(first.userId).orElseThrow().getEmail())
                .isEqualTo(first.email);
        assertThat(userRepository.findById(second.userId).orElseThrow().getEmail())
                .isEqualTo(second.email);
    }

    @Test
    void updatingYourOwnEmailToItselfIsNotAConflict() {
        Session session = newUser();

        ResponseEntity<UserResponse> response =
                exchange(
                        HttpMethod.PUT,
                        "/api/v1/auth/me",
                        new UpdateProfileRequest("Renamed", session.email),
                        session.accessToken,
                        UserResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void anAttemptToSetTheRoleIsIgnored() {
        Session session = newUser();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(session.accessToken);
        String body =
                "{\"fullName\":\"Still User\",\"email\":\""
                        + session.email
                        + "\",\"role\":\"ADMIN\"}";

        ResponseEntity<UserResponse> response =
                restTemplate.exchange(
                        "/api/v1/auth/me",
                        HttpMethod.PUT,
                        new HttpEntity<>(body, headers),
                        UserResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(userRepository.findById(session.userId).orElseThrow().getRole())
                .isEqualTo(Role.USER);
    }

    @Test
    void invalidPayloadReturns400WithFieldErrors() {
        Session session = newUser();

        ResponseEntity<Map> response =
                exchange(
                        HttpMethod.PUT,
                        "/api/v1/auth/me",
                        new UpdateProfileRequest("", "not-an-email"),
                        session.accessToken,
                        Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        @SuppressWarnings("unchecked")
        Map<String, Object> fieldErrors = (Map<String, Object>) response.getBody().get("fieldErrors");
        assertThat(fieldErrors).containsKeys("fullName", "email");
        assertThat(userRepository.findById(session.userId).orElseThrow().getEmail())
                .isEqualTo(session.email);
    }

    @Test
    void anEmailDifferingOnlyByCaseIsTreatedAsTheSameAddress() {
        Session first = newUser();
        Session second = newUser();

        ResponseEntity<String> response =
                exchange(
                        HttpMethod.PUT,
                        "/api/v1/auth/me",
                        new UpdateProfileRequest("New Name", second.email.toUpperCase(java.util.Locale.ROOT)),
                        first.accessToken,
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void updateProfileWithoutTokenReturns401() {
        ResponseEntity<String> response =
                restTemplate.exchange(
                        "/api/v1/auth/me",
                        HttpMethod.PUT,
                        new HttpEntity<>(new UpdateProfileRequest("Name", "a@example.com")),
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void changePasswordWithoutTokenReturns401() {
        Session session = newUser();

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/me/password",
                        new ChangePasswordRequest(PASSWORD, "brand-new1", session.refreshToken),
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(passwordEncoder.matches(PASSWORD, userRepository.findById(session.userId).orElseThrow().getPasswordHash()))
                .isTrue();
    }

    @Test
    void validPasswordChangeReturns204AndTheNewHashVerifies() {
        Session session = newUser();

        ResponseEntity<Void> response =
                exchange(
                        HttpMethod.POST,
                        "/api/v1/auth/me/password",
                        new ChangePasswordRequest(PASSWORD, "brand-new1", session.refreshToken),
                        session.accessToken,
                        Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        String storedHash = userRepository.findById(session.userId).orElseThrow().getPasswordHash();
        assertThat(passwordEncoder.matches("brand-new1", storedHash)).isTrue();
        assertThat(passwordEncoder.matches(PASSWORD, storedHash)).isFalse();
    }

    @Test
    void wrongCurrentPasswordReturns400AndLeavesTheHashUnchanged() {
        Session session = newUser();
        String hashBefore = userRepository.findById(session.userId).orElseThrow().getPasswordHash();

        ResponseEntity<Map> response =
                exchange(
                        HttpMethod.POST,
                        "/api/v1/auth/me/password",
                        new ChangePasswordRequest("wrong-password1", "brand-new1", session.refreshToken),
                        session.accessToken,
                        Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("fieldErrors"))
                .isEqualTo(Map.of("currentPassword", "Current password is incorrect"));
        assertThat(userRepository.findById(session.userId).orElseThrow().getPasswordHash())
                .isEqualTo(hashBefore);
    }

    @Test
    void newPasswordShorterThanEightCharactersReturns400() {
        Session session = newUser();

        ResponseEntity<Map> response =
                exchange(
                        HttpMethod.POST,
                        "/api/v1/auth/me/password",
                        new ChangePasswordRequest(PASSWORD, "short", session.refreshToken),
                        session.accessToken,
                        Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void newPasswordWithNoDigitReturns400() {
        Session session = newUser();

        ResponseEntity<Map> response =
                exchange(
                        HttpMethod.POST,
                        "/api/v1/auth/me/password",
                        new ChangePasswordRequest(PASSWORD, "nodigitshere", session.refreshToken),
                        session.accessToken,
                        Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void newPasswordSameAsCurrentIsRejected() {
        Session session = newUser();

        ResponseEntity<Map> response =
                exchange(
                        HttpMethod.POST,
                        "/api/v1/auth/me/password",
                        new ChangePasswordRequest(PASSWORD, PASSWORD, session.refreshToken),
                        session.accessToken,
                        Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void aRefreshTokenNotBelongingToTheCallerRollsBackTheWholeChange() {
        Session session = newUser();
        Session other = newUser();
        String hashBefore = userRepository.findById(session.userId).orElseThrow().getPasswordHash();

        ResponseEntity<String> response =
                exchange(
                        HttpMethod.POST,
                        "/api/v1/auth/me/password",
                        new ChangePasswordRequest(PASSWORD, "brand-new1", other.refreshToken),
                        session.accessToken,
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(userRepository.findById(session.userId).orElseThrow().getPasswordHash())
                .isEqualTo(hashBefore);
    }

    @Test
    void passwordChangeRevokesEverySessionExceptTheCaller() {
        Session session = newUser();
        TokenPairResponse otherSession = login(session.email, PASSWORD);

        ResponseEntity<Void> change =
                exchange(
                        HttpMethod.POST,
                        "/api/v1/auth/me/password",
                        new ChangePasswordRequest(PASSWORD, "brand-new1", session.refreshToken),
                        session.accessToken,
                        Void.class);
        assertThat(change.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Checked before the other session, deliberately: refreshing an already-revoked token
        // trips the reuse/theft-detection path (RefreshTokenService.rotate), which revokes the
        // whole token family — including the kept one. Checking the caller's session first keeps
        // this test about revokeAllExcept, not about that separate (and separately tested) path.
        ResponseEntity<TokenPairResponse> callerRefresh =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh",
                        new RefreshRequest(session.refreshToken),
                        TokenPairResponse.class);
        assertThat(callerRefresh.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> otherSessionRefresh =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh", new RefreshRequest(otherSession.refreshToken()), String.class);
        assertThat(otherSessionRefresh.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private Session newUser() {
        String email = "profile-test-" + COUNTER.incrementAndGet() + "@example.com";
        User user = new User(email, passwordEncoder.encode(PASSWORD), "Test User", Role.USER);
        user = userRepository.save(user);
        TokenPairResponse tokens = login(email, PASSWORD);
        return new Session(user.getId(), email, tokens.accessToken(), tokens.refreshToken());
    }

    private TokenPairResponse login(String email, String password) {
        ResponseEntity<TokenPairResponse> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/login", new LoginRequest(email, password), TokenPairResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private <T> ResponseEntity<T> exchange(
            HttpMethod method, String path, Object body, String accessToken, Class<T> responseType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(path, method, new HttpEntity<>(body, headers), responseType);
    }

    private record Session(Long userId, String email, String accessToken, String refreshToken) {}
}
