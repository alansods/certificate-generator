package com.certificategenerator.auth.reset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.certificategenerator.auth.RateLimitExceededException;
import com.certificategenerator.auth.RateLimiter;
import com.certificategenerator.auth.RefreshTokenService;
import com.certificategenerator.auth.Role;
import com.certificategenerator.auth.User;
import com.certificategenerator.auth.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

class PasswordResetServiceTest {

    private static final String CLIENT_IP = "203.0.113.1";
    private static final String FRONTEND_BASE_URL = "https://app.example.com";

    private UserRepository userRepository;
    private PasswordResetTokenRepository tokenRepository;
    private PasswordEncoder passwordEncoder;
    private RefreshTokenService refreshTokenService;
    private PasswordResetMailDispatcher passwordResetMailDispatcher;
    private User user;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        tokenRepository = mock(PasswordResetTokenRepository.class);
        when(tokenRepository.markUsedIfUnused(any(), any())).thenReturn(1);
        passwordEncoder = mock(PasswordEncoder.class);
        when(passwordEncoder.encode(anyString())).thenReturn("new-hash");
        refreshTokenService = mock(RefreshTokenService.class);
        passwordResetMailDispatcher = mock(PasswordResetMailDispatcher.class);

        user = new User("jane@example.com", "old-hash", "Jane Doe", Role.USER);
    }

    private PasswordResetService newService() {
        return newService(10, Duration.ofMinutes(15), 3, Duration.ofMinutes(15), 10, Duration.ofMinutes(15));
    }

    private PasswordResetService newService(
            int requestMaxIp,
            Duration requestWindowIp,
            int requestMaxEmail,
            Duration requestWindowEmail,
            int completeMax,
            Duration completeWindow) {
        return new PasswordResetService(
                userRepository,
                tokenRepository,
                passwordEncoder,
                refreshTokenService,
                passwordResetMailDispatcher,
                new RateLimiter(),
                FRONTEND_BASE_URL,
                requestMaxIp,
                requestWindowIp,
                requestMaxEmail,
                requestWindowEmail,
                completeMax,
                completeWindow);
    }

    @Test
    void requestResetForAKnownEnabledUserCreatesATokenAndDispatchesMail() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(user));

        newService().requestReset("jane@example.com", CLIENT_IP);

        verify(tokenRepository).deleteUnusedForUser(user);
        verify(tokenRepository).save(any(PasswordResetToken.class));

        ArgumentCaptor<String> resetLinkCaptor = ArgumentCaptor.forClass(String.class);
        verify(passwordResetMailDispatcher).dispatch(eq("jane@example.com"), resetLinkCaptor.capture());
        assertThat(resetLinkCaptor.getValue()).startsWith(FRONTEND_BASE_URL + "/reset-password?token=");
    }

    @Test
    void requestResetStillCompletesEvenIfTheMailDispatcherThrows() {
        // @Async isn't active without a real Spring context in a plain unit test, so a mock that
        // throws synchronously stands in for a dispatcher failure — proving the always-202
        // contract holds even in that case, per design.md "Always answering 202".
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("mail provider outage"))
                .when(passwordResetMailDispatcher)
                .dispatch(anyString(), anyString());

        assertThatCode(() -> newService().requestReset("jane@example.com", CLIENT_IP)).doesNotThrowAnyException();

        verify(passwordResetMailDispatcher).dispatch(eq("jane@example.com"), anyString());
    }

    @Test
    void requestResetForADisabledUserCreatesNoTokenAndDispatchesNoMail() {
        User disabledUser = mock(User.class);
        when(disabledUser.isEnabled()).thenReturn(false);
        when(userRepository.findByEmail("disabled@example.com")).thenReturn(Optional.of(disabledUser));

        newService().requestReset("disabled@example.com", CLIENT_IP);

        verify(tokenRepository, never()).save(any());
        verify(passwordResetMailDispatcher, never()).dispatch(any(), any());
    }

    @Test
    void requestResetNormalizesTheEmailToLowercase() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(user));

        newService().requestReset("  Jane@Example.COM  ", CLIENT_IP);

        verify(userRepository).findByEmail("jane@example.com");
    }

    @Test
    void requestResetForAnUnknownEmailCreatesNoTokenAndSendsNoMail() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        newService().requestReset("nobody@example.com", CLIENT_IP);

        verify(tokenRepository, never()).save(any());
        verify(passwordResetMailDispatcher, never()).dispatch(any(), any());
    }

    @Test
    void requestResetIsRateLimitedPerIpRegardlessOfWhetherTheEmailMatches() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        PasswordResetService service = newService(3, Duration.ofMinutes(15), 100, Duration.ofMinutes(15), 10, Duration.ofMinutes(15));

        for (int i = 0; i < 3; i++) {
            service.requestReset("probe" + i + "@example.com", CLIENT_IP);
        }

        assertThatThrownBy(() -> service.requestReset("probe-final@example.com", CLIENT_IP))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void requestResetIsRateLimitedPerEmailEvenFromDifferentIps() {
        when(userRepository.findByEmail("target@example.com")).thenReturn(Optional.of(user));
        PasswordResetService service = newService(100, Duration.ofMinutes(15), 3, Duration.ofMinutes(15), 10, Duration.ofMinutes(15));

        for (int i = 0; i < 3; i++) {
            service.requestReset("target@example.com", "203.0.113." + i);
        }

        assertThatThrownBy(() -> service.requestReset("target@example.com", "203.0.113.99"))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void completeResetWithAValidTokenChangesThePasswordClaimsTheTokenAndRevokesEverySession() {
        PasswordResetToken token = new PasswordResetToken(user, PasswordResetService.hash("raw-token"), Instant.now().plusSeconds(60));
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("raw-token"))).thenReturn(Optional.of(token));

        newService().completeReset("raw-token", "brand-new1", CLIENT_IP);

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        verify(tokenRepository).markUsedIfUnused(eq(token.getId()), any(Instant.class));
        verify(userRepository).save(user);
        verify(refreshTokenService).revokeAll(user);
    }

    @Test
    void completeResetLosingTheRaceToClaimTheTokenThrowsAndChangesNothing() {
        PasswordResetToken token = new PasswordResetToken(user, PasswordResetService.hash("raw-token"), Instant.now().plusSeconds(60));
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("raw-token"))).thenReturn(Optional.of(token));
        // Simulates a concurrent request having already claimed this token between the lookup
        // above and this atomic claim.
        when(tokenRepository.markUsedIfUnused(any(), any())).thenReturn(0);

        assertThatThrownBy(() -> newService().completeReset("raw-token", "brand-new1", CLIENT_IP))
                .isInstanceOf(InvalidPasswordResetTokenException.class);

        assertThat(user.getPasswordHash()).isEqualTo("old-hash");
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).revokeAll(any());
    }

    @Test
    void completeResetForATokenWhoseUserIsDisabledThrowsAndChangesNothing() {
        User disabledUser = mock(User.class);
        when(disabledUser.isEnabled()).thenReturn(false);
        PasswordResetToken token =
                new PasswordResetToken(disabledUser, PasswordResetService.hash("raw-token"), Instant.now().plusSeconds(60));
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("raw-token"))).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> newService().completeReset("raw-token", "brand-new1", CLIENT_IP))
                .isInstanceOf(InvalidPasswordResetTokenException.class);

        verify(tokenRepository, never()).markUsedIfUnused(any(), any());
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).revokeAll(any());
    }

    @Test
    void completeResetWithAnUnknownTokenThrowsAndChangesNothing() {
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> newService().completeReset("unknown-token", "brand-new1", CLIENT_IP))
                .isInstanceOf(InvalidPasswordResetTokenException.class);

        verify(refreshTokenService, never()).revokeAll(any());
    }

    @Test
    void completeResetWithAnExpiredTokenThrowsAndChangesNothing() {
        PasswordResetToken token = new PasswordResetToken(user, PasswordResetService.hash("raw-token"), Instant.now().minusSeconds(1));
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("raw-token"))).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> newService().completeReset("raw-token", "brand-new1", CLIENT_IP))
                .isInstanceOf(InvalidPasswordResetTokenException.class);

        assertThat(user.getPasswordHash()).isEqualTo("old-hash");
        verify(refreshTokenService, never()).revokeAll(any());
    }

    @Test
    void completeResetWithAnAlreadyUsedTokenThrowsAndChangesNothing() {
        PasswordResetToken token = new PasswordResetToken(user, PasswordResetService.hash("raw-token"), Instant.now().plusSeconds(60));
        token.markUsed();
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("raw-token"))).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> newService().completeReset("raw-token", "brand-new1", CLIENT_IP))
                .isInstanceOf(InvalidPasswordResetTokenException.class);

        assertThat(user.getPasswordHash()).isEqualTo("old-hash");
    }

    @Test
    void completeResetIsRateLimitedPerIpAfterTheConfiguredNumberOfAttempts() {
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());
        PasswordResetService service = newService(10, Duration.ofMinutes(15), 3, Duration.ofMinutes(15), 3, Duration.ofMinutes(15));

        for (int i = 0; i < 3; i++) {
            assertThatThrownBy(() -> service.completeReset("bad-token", "brand-new1", CLIENT_IP))
                    .isInstanceOf(InvalidPasswordResetTokenException.class);
        }

        assertThatThrownBy(() -> service.completeReset("bad-token", "brand-new1", CLIENT_IP))
                .isInstanceOf(RateLimitExceededException.class);
    }
}
