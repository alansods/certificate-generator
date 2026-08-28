package com.certificategenerator.auth.reset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
import com.certificategenerator.mail.MailSender;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

class PasswordResetServiceTest {

    private static final String CLIENT_IP = "203.0.113.1";
    private static final String FRONTEND_BASE_URL = "https://app.example.com";

    private UserRepository userRepository;
    private PasswordResetTokenRepository tokenRepository;
    private PasswordEncoder passwordEncoder;
    private RefreshTokenService refreshTokenService;
    private MailSender mailSender;
    private TemplateEngine templateEngine;
    private User user;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        tokenRepository = mock(PasswordResetTokenRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        when(passwordEncoder.encode(anyString())).thenReturn("new-hash");
        refreshTokenService = mock(RefreshTokenService.class);
        mailSender = mock(MailSender.class);
        templateEngine = mock(TemplateEngine.class);
        when(templateEngine.process(eq("mail/password-reset"), any())).thenReturn("<html>reset link</html>");

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
                mailSender,
                templateEngine,
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
    void requestResetForAKnownEnabledUserCreatesATokenAndSendsMail() {
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.of(user));

        newService().requestReset("jane@example.com", CLIENT_IP);

        verify(tokenRepository).deleteUnusedForUser(user);
        verify(tokenRepository).save(any(PasswordResetToken.class));
        verify(mailSender).send(eq("jane@example.com"), anyString(), anyString());

        ArgumentCaptor<Context> contextCaptor = ArgumentCaptor.forClass(Context.class);
        verify(templateEngine).process(eq("mail/password-reset"), contextCaptor.capture());
        assertThat((String) contextCaptor.getValue().getVariable("resetLink"))
                .startsWith(FRONTEND_BASE_URL + "/reset-password?token=");
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
        verify(mailSender, never()).send(any(), any(), any());
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
    void completeResetWithAValidTokenChangesThePasswordMarksTheTokenUsedAndRevokesEverySession() {
        PasswordResetToken token = new PasswordResetToken(user, PasswordResetService.hash("raw-token"), Instant.now().plusSeconds(60));
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("raw-token"))).thenReturn(Optional.of(token));

        newService().completeReset("raw-token", "brand-new1", CLIENT_IP);

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        assertThat(token.isUsed()).isTrue();
        verify(tokenRepository).save(token);
        verify(refreshTokenService).revokeAll(user);
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
