package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.dto.RefreshRequest;
import com.certificategenerator.auth.dto.RegisterRequest;
import com.certificategenerator.auth.dto.RegistrationStatusResponse;
import com.certificategenerator.auth.dto.TokenPairResponse;
import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.UserResponse;
import java.util.Locale;
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
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Exercises POST /api/v1/auth/register and GET /api/v1/auth/registration-enabled end to end. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class RegisterIntegrationTest {

    private static final AtomicInteger COUNTER = new AtomicInteger();

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void validRegistrationReturns201AndATokenPairAndStoresAUserRoleAccount() {
        String email = nextEmail();

        ResponseEntity<TokenPairResponse> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/register",
                        new RegisterRequest("New User", email, "correct-horse1"),
                        TokenPairResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().accessToken()).isNotBlank();
        assertThat(response.getBody().refreshToken()).isNotBlank();
        User stored = userRepository.findByEmail(email).orElseThrow();
        assertThat(stored.getFullName()).isEqualTo("New User");
        assertThat(stored.getRole()).isEqualTo(Role.USER);
        assertThat(stored.isEnabled()).isTrue();
        assertThat(stored.getPasswordHash()).isNotEqualTo("correct-horse1");
    }

    @Test
    void theIssuedAccessTokenAuthenticatesAsTheNewAccount() {
        String email = nextEmail();
        TokenPairResponse tokens =
                restTemplate
                        .postForEntity(
                                "/api/v1/auth/register",
                                new RegisterRequest("New User", email, "correct-horse1"),
                                TokenPairResponse.class)
                        .getBody();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(tokens.accessToken());
        ResponseEntity<UserResponse> me =
                restTemplate.exchange(
                        "/api/v1/auth/me", HttpMethod.GET, new HttpEntity<>(headers), UserResponse.class);

        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody().email()).isEqualTo(email);
    }

    @Test
    void theIssuedRefreshTokenRotatesUnderTheExistingRefreshRules() {
        TokenPairResponse tokens =
                restTemplate
                        .postForEntity(
                                "/api/v1/auth/register",
                                new RegisterRequest("New User", nextEmail(), "correct-horse1"),
                                TokenPairResponse.class)
                        .getBody();

        ResponseEntity<TokenPairResponse> refreshed =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh",
                        new RefreshRequest(tokens.refreshToken()),
                        TokenPairResponse.class);

        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(refreshed.getBody().refreshToken()).isNotEqualTo(tokens.refreshToken());

        // Rotation revokes the superseded token, so reusing it now trips theft detection.
        ResponseEntity<String> reuse =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh", new RefreshRequest(tokens.refreshToken()), String.class);
        assertThat(reuse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void anAlreadyRegisteredEmailReturns409AndCreatesNoSecondAccount() {
        String email = nextEmail();
        restTemplate.postForEntity(
                "/api/v1/auth/register",
                new RegisterRequest("First", email, "correct-horse1"),
                TokenPairResponse.class);

        ResponseEntity<Map> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/register",
                        new RegisterRequest("Second", email, "another-horse2"),
                        Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        @SuppressWarnings("unchecked")
        Map<String, Object> fieldErrors = (Map<String, Object>) response.getBody().get("fieldErrors");
        assertThat(fieldErrors).containsKey("email");
    }

    @Test
    void anEmailDifferingOnlyByCaseIsTreatedAsTheSameAddress() {
        String email = nextEmail();
        restTemplate.postForEntity(
                "/api/v1/auth/register",
                new RegisterRequest("First", email, "correct-horse1"),
                TokenPairResponse.class);

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/register",
                        new RegisterRequest("Second", email.toUpperCase(Locale.ROOT), "another-horse2"),
                        String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void aPasswordShorterThanEightCharactersReturns400WithAFieldError() {
        ResponseEntity<Map> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/register",
                        new RegisterRequest("New User", nextEmail(), "short1"),
                        Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        @SuppressWarnings("unchecked")
        Map<String, Object> fieldErrors = (Map<String, Object>) response.getBody().get("fieldErrors");
        assertThat(fieldErrors).containsKey("password");
    }

    @Test
    void aPasswordWithNoDigitReturns400WithAFieldError() {
        ResponseEntity<Map> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/register",
                        new RegisterRequest("New User", nextEmail(), "nodigitshere"),
                        Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        @SuppressWarnings("unchecked")
        Map<String, Object> fieldErrors = (Map<String, Object>) response.getBody().get("fieldErrors");
        assertThat(fieldErrors).containsKey("password");
    }

    @Test
    void aBlankFullNameOrMalformedEmailReturns400WithFieldErrors() {
        ResponseEntity<Map> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/register",
                        new RegisterRequest("", "not-an-email", "correct-horse1"),
                        Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        @SuppressWarnings("unchecked")
        Map<String, Object> fieldErrors = (Map<String, Object>) response.getBody().get("fieldErrors");
        assertThat(fieldErrors).containsKeys("fullName", "email");
    }

    @Test
    void registrationEnabledReportsTrueByDefault() {
        ResponseEntity<RegistrationStatusResponse> response =
                restTemplate.getForEntity(
                        "/api/v1/auth/registration-enabled", RegistrationStatusResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().enabled()).isTrue();
    }

    @Test
    void anAlreadyAuthenticatedCallerCanStillRegisterAndCheckTheRegistrationFlag() {
        String callerEmail = "signup-caller-" + COUNTER.incrementAndGet() + "@example.com";
        User caller = new User(callerEmail, passwordEncoder.encode("correct-horse1"), "Caller", Role.USER);
        userRepository.save(caller);
        TokenPairResponse callerTokens =
                restTemplate
                        .postForEntity(
                                "/api/v1/auth/login",
                                new LoginRequest(callerEmail, "correct-horse1"),
                                TokenPairResponse.class)
                        .getBody();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(callerTokens.accessToken());

        ResponseEntity<TokenPairResponse> registerResponse =
                restTemplate.exchange(
                        "/api/v1/auth/register",
                        HttpMethod.POST,
                        new HttpEntity<>(new RegisterRequest("New User", nextEmail(), "correct-horse1"), headers),
                        TokenPairResponse.class);
        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<RegistrationStatusResponse> statusResponse =
                restTemplate.exchange(
                        "/api/v1/auth/registration-enabled",
                        HttpMethod.GET,
                        new HttpEntity<>(headers),
                        RegistrationStatusResponse.class);
        assertThat(statusResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private static String nextEmail() {
        return "signup-test-" + COUNTER.incrementAndGet() + "@example.com";
    }
}
