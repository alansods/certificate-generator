package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Confirms AuthService.refresh is actually wired to app.rate-limit.refresh.* — the algorithm
 * itself is covered by RateLimiterTest, but that doesn't prove the endpoint uses it correctly.
 * Unit-level (not HTTP) so it isn't at the mercy of every test in the suite sharing one loopback
 * IP against the same refresh:&lt;ip&gt; key.
 */
class AuthServiceRateLimitTest {

    @Test
    void refreshIsBlockedAfterTheConfiguredNumberOfFailedAttempts() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        when(passwordEncoder.encode(org.mockito.ArgumentMatchers.any())).thenReturn("hash");
        JwtService jwtService = mock(JwtService.class);
        RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
        when(refreshTokenService.rotate(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new InvalidRefreshTokenException("invalid"));

        int maxAttempts = 3;
        AuthService authService =
                new AuthService(
                        userRepository,
                        passwordEncoder,
                        jwtService,
                        refreshTokenService,
                        new RateLimiter(),
                        5,
                        Duration.ofMinutes(15),
                        maxAttempts,
                        Duration.ofMinutes(15),
                        30,
                        Duration.ofMinutes(1),
                        5,
                        Duration.ofMinutes(15),
                        20,
                        Duration.ofMinutes(15));

        String clientIp = "203.0.113.1";
        for (int i = 0; i < maxAttempts; i++) {
            assertThatThrownBy(() -> authService.refresh("bad-token", clientIp))
                    .isInstanceOf(InvalidRefreshTokenException.class);
        }

        assertThatThrownBy(() -> authService.refresh("bad-token", clientIp))
                .isInstanceOf(RateLimitExceededException.class);
    }
}
