package com.certificategenerator.auth.reset;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.TestcontainersConfiguration;
import com.certificategenerator.auth.Role;
import com.certificategenerator.auth.User;
import com.certificategenerator.auth.UserRepository;
import com.certificategenerator.auth.dto.ForgotPasswordRequest;
import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.ResetPasswordRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
import com.certificategenerator.mail.MailSender;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

/**
 * Exercises POST /api/v1/auth/forgot-password and POST /api/v1/auth/reset-password end to end.
 * Replaces the default {@link com.certificategenerator.mail.LoggingMailSender} with a {@link
 * RecordingMailSender} so tests can assert on what would have been sent, without a real SMTP
 * account or parsing log output.
 *
 * <p>The rate-limit thresholds are raised well past what this class's ~9 real requests could ever
 * hit: the actual threshold behavior is exercised in isolation by {@link
 * PasswordResetRateLimitIntegrationTest}, which uses its own tiny thresholds. Without this, a
 * single additional test here would risk pushing the shared-context {@code RateLimiter} singleton
 * past the default {@code app.rate-limit.password-reset-request-ip.max-attempts: 10} and causing
 * spurious 429s.
 */
@Import({TestcontainersConfiguration.class, PasswordResetIntegrationTest.Config.class})
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@TestPropertySource(
        properties = {
            "app.rate-limit.password-reset-request-ip.max-attempts=1000",
            "app.rate-limit.password-reset-request-email.max-attempts=1000",
            "app.rate-limit.password-reset-complete.max-attempts=1000"
        })
class PasswordResetIntegrationTest {

    private static final AtomicInteger COUNTER = new AtomicInteger();

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private PasswordResetTokenRepository tokenRepository;
    @Autowired private RecordingMailSender mailSender;

    @BeforeEach
    void clearMail() {
        mailSender.clear();
    }

    @Test
    void aKnownEmailReturns202AndSendsAnEmailContainingTheConfiguredBaseUrl() {
        String email = nextEmail();
        newUser(email);

        ResponseEntity<Void> response = requestReset(email);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        awaitMailCount(1);
        assertThat(mailSender.sent()).hasSize(1);
        RecordingMailSender.Email sent = mailSender.sent().get(0);
        assertThat(sent.to()).isEqualTo(email);
        assertThat(sent.htmlBody()).contains("/reset-password?token=");
    }

    @Test
    void anUnknownEmailReturns202AndSendsNoEmail() {
        ResponseEntity<Void> response = requestReset("no-such-account-" + nextEmail());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        assertThat(mailSender.sent()).isEmpty();
    }

    @Test
    void theLinkIsBuiltFromTheConfiguredBaseUrlEvenWithAHostileHostHeader() {
        String email = nextEmail();
        newUser(email);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        headers.set("Host", "attacker.example");
        headers.set("X-Forwarded-Host", "attacker.example");
        restTemplate.exchange(
                "/api/v1/auth/forgot-password",
                org.springframework.http.HttpMethod.POST,
                new org.springframework.http.HttpEntity<>(new ForgotPasswordRequest(email), headers),
                Void.class);

        awaitMailCount(1);
        assertThat(mailSender.sent()).hasSize(1);
        assertThat(mailSender.sent().get(0).htmlBody()).doesNotContain("attacker.example");
    }

    @Test
    void aNewRequestInvalidatesThePreviousToken() {
        String email = nextEmail();
        User user = newUser(email);

        requestReset(email);
        awaitMailCount(1);
        String firstToken = extractToken(mailSender.sent().get(0).htmlBody());
        requestReset(email);
        awaitMailCount(2);
        String secondToken = extractToken(mailSender.sent().get(1).htmlBody());

        ResponseEntity<Map> firstAttempt = resetWith(firstToken, "another-horse2");
        assertThat(firstAttempt.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<Map> secondAttempt = resetWith(secondToken, "another-horse2");
        assertThat(secondAttempt.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(passwordEncoder.matches("another-horse2", userRepository.findById(user.getId()).orElseThrow().getPasswordHash()))
                .isTrue();
    }

    @Test
    void resetSucceedsOnceThenTheSameTokenFailsWith400() {
        String email = nextEmail();
        newUser(email);
        requestReset(email);
        awaitMailCount(1);
        String token = extractToken(mailSender.sent().get(0).htmlBody());

        ResponseEntity<Map> first = resetWith(token, "another-horse2");
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<Map> second = resetWith(token, "yet-another3");
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void anExpiredTokenFailsWith400AndChangesNothing() {
        String email = nextEmail();
        User user = newUser(email);
        String rawToken = PasswordResetService.generateRawToken();
        tokenRepository.save(
                new PasswordResetToken(user, PasswordResetService.hash(rawToken), Instant.now().minusSeconds(1)));

        ResponseEntity<Map> response = resetWith(rawToken, "another-horse2");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(userRepository.findById(user.getId()).orElseThrow().getPasswordHash())
                .isEqualTo(user.getPasswordHash());
    }

    @Test
    void anUnknownTokenFailsWith400() {
        ResponseEntity<Map> response = resetWith("not-a-real-token", "another-horse2");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void onlyTheHashIsPersistedNeverTheRawToken() {
        String email = nextEmail();
        newUser(email);
        requestReset(email);
        awaitMailCount(1);
        String rawToken = extractToken(mailSender.sent().get(0).htmlBody());

        List<PasswordResetToken> all = tokenRepository.findAll();
        assertThat(all).isNotEmpty();
        assertThat(all).noneMatch(t -> t.getTokenHash().equals(rawToken));
    }

    @Test
    void aCompletedResetRevokesEverySessionAndTheOldRefreshTokenThenReturns401() {
        String email = nextEmail();
        newUser(email);
        TokenPairResponse tokens = login(email, "correct-horse1");

        requestReset(email);
        awaitMailCount(1);
        String resetToken = extractToken(mailSender.sent().get(0).htmlBody());
        resetWith(resetToken, "another-horse2");

        ResponseEntity<String> refreshed =
                restTemplate.postForEntity(
                        "/api/v1/auth/refresh",
                        new com.certificategenerator.auth.dto.RefreshRequest(tokens.refreshToken()),
                        String.class);
        assertThat(refreshed.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void newPasswordFailingThePolicyReturns400WithAFieldError() {
        String email = nextEmail();
        newUser(email);
        requestReset(email);
        awaitMailCount(1);
        String token = extractToken(mailSender.sent().get(0).htmlBody());

        ResponseEntity<Map> response = resetWith(token, "short1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        @SuppressWarnings("unchecked")
        Map<String, Object> fieldErrors = (Map<String, Object>) response.getBody().get("fieldErrors");
        assertThat(fieldErrors).containsKey("newPassword");
    }

    @Test
    void aMalformedEmailReturns400WithAFieldError() {
        ResponseEntity<Map> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/forgot-password", new ForgotPasswordRequest("not-an-email"), Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        @SuppressWarnings("unchecked")
        Map<String, Object> fieldErrors = (Map<String, Object>) response.getBody().get("fieldErrors");
        assertThat(fieldErrors).containsKey("email");
    }

    private User newUser(String email) {
        User user = new User(email, passwordEncoder.encode("correct-horse1"), "Test User", Role.USER);
        return userRepository.save(user);
    }

    private TokenPairResponse login(String email, String password) {
        ResponseEntity<TokenPairResponse> response =
                restTemplate.postForEntity(
                        "/api/v1/auth/login", new LoginRequest(email, password), TokenPairResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private ResponseEntity<Void> requestReset(String email) {
        return restTemplate.postForEntity(
                "/api/v1/auth/forgot-password", new ForgotPasswordRequest(email), Void.class);
    }

    /**
     * The reset email is now dispatched off the request thread (see
     * PasswordResetMailDispatcher and design.md "Always answering 202"), so a 202 response no
     * longer guarantees the {@link RecordingMailSender} has recorded the send yet. Polls briefly
     * instead of asserting immediately.
     */
    private void awaitMailCount(int expectedCount) {
        Instant deadline = Instant.now().plusSeconds(5);
        while (mailSender.sent().size() < expectedCount && Instant.now().isBefore(deadline)) {
            try {
                Thread.sleep(20);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(e);
            }
        }
    }

    private ResponseEntity<Map> resetWith(String token, String newPassword) {
        return restTemplate.postForEntity(
                "/api/v1/auth/reset-password", new ResetPasswordRequest(token, newPassword), Map.class);
    }

    private static String extractToken(String htmlBody) {
        int index = htmlBody.indexOf("token=");
        String tail = htmlBody.substring(index + "token=".length());
        int end = tail.indexOf('"');
        return end >= 0 ? tail.substring(0, end) : tail.trim();
    }

    private static String nextEmail() {
        return "reset-test-" + COUNTER.incrementAndGet() + "@example.com";
    }

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        RecordingMailSender recordingMailSender() {
            return new RecordingMailSender();
        }
    }

    static class RecordingMailSender implements MailSender {
        private final List<Email> sent = new CopyOnWriteArrayList<>();

        @Override
        public void send(String to, String subject, String htmlBody) {
            sent.add(new Email(to, subject, htmlBody));
        }

        List<Email> sent() {
            return sent;
        }

        void clear() {
            sent.clear();
        }

        record Email(String to, String subject, String htmlBody) {}
    }
}
