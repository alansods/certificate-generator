package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.certificategenerator.auth.dto.TokenPairResponse;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceRegisterTest {

    private static final String CLIENT_IP = "203.0.113.1";

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        jwtService = mock(JwtService.class);
        when(jwtService.issueAccessToken(any())).thenReturn("access-token");
        when(jwtService.accessTokenTtlSeconds()).thenReturn(900L);
        refreshTokenService = mock(RefreshTokenService.class);
        when(refreshTokenService.issue(any())).thenReturn("refresh-token");
        when(userRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private AuthService newAuthService(boolean registrationEnabled) {
        return new AuthService(
                userRepository,
                passwordEncoder,
                jwtService,
                refreshTokenService,
                new UserMapper(),
                new RateLimiter(),
                5,
                Duration.ofMinutes(15),
                20,
                Duration.ofMinutes(15),
                30,
                Duration.ofMinutes(1),
                5,
                Duration.ofMinutes(15),
                20,
                Duration.ofMinutes(15),
                10,
                Duration.ofMinutes(15),
                registrationEnabled);
    }

    @Test
    void registerCreatesAUserRoleAccountAndReturnsTokens() {
        AuthService authService = newAuthService(true);
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.empty());

        TokenPairResponse tokens = authService.register("Jane Doe", "jane@example.com", "correct-horse1", CLIENT_IP);

        assertThat(tokens.accessToken()).isEqualTo("access-token");
        assertThat(tokens.refreshToken()).isEqualTo("refresh-token");
        verify(userRepository)
                .saveAndFlush(
                        org.mockito.ArgumentMatchers.argThat(
                                saved ->
                                        saved.getEmail().equals("jane@example.com")
                                                && saved.getFullName().equals("Jane Doe")
                                                && saved.getRole() == Role.USER
                                                && saved.getPasswordHash().equals("hashed")));
    }

    @Test
    void registerNormalizesTheEmailToLowercase() {
        AuthService authService = newAuthService(true);
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.empty());

        authService.register("Jane Doe", "  Jane@Example.COM  ", "correct-horse1", CLIENT_IP);

        verify(userRepository).findByEmail("jane@example.com");
    }

    @Test
    void registerWithAnAlreadyTakenEmailThrowsAndSavesNothing() {
        AuthService authService = newAuthService(true);
        when(userRepository.findByEmail("jane@example.com"))
                .thenReturn(Optional.of(new User("jane@example.com", "hash", "Existing", Role.USER)));

        assertThatThrownBy(
                        () -> authService.register("Jane Doe", "jane@example.com", "correct-horse1", CLIENT_IP))
                .isInstanceOf(EmailAlreadyRegisteredException.class);

        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void registerTurnsAConcurrentUniqueConstraintViolationIntoTheSameConflict() {
        AuthService authService = newAuthService(true);
        when(userRepository.findByEmail("jane@example.com")).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(
                        () -> authService.register("Jane Doe", "jane@example.com", "correct-horse1", CLIENT_IP))
                .isInstanceOf(EmailAlreadyRegisteredException.class);
    }

    @Test
    void registerIsBlockedAfterTheConfiguredNumberOfAttemptsFromTheSameIp() {
        AuthService authService = newAuthService(true);
        when(userRepository.findByEmail(anyString()))
                .thenReturn(Optional.of(new User("taken@example.com", "hash", "Existing", Role.USER)));

        for (int i = 0; i < 10; i++) {
            assertThatThrownBy(
                            () ->
                                    authService.register(
                                            "Jane Doe", "taken@example.com", "correct-horse1", CLIENT_IP))
                    .isInstanceOf(EmailAlreadyRegisteredException.class);
        }

        assertThatThrownBy(
                        () ->
                                authService.register(
                                        "Jane Doe", "taken@example.com", "correct-horse1", CLIENT_IP))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void registerWhenDisabledThrowsWithoutTouchingTheRateLimiterOrRepository() {
        AuthService authService = newAuthService(false);

        assertThatThrownBy(
                        () -> authService.register("Jane Doe", "jane@example.com", "correct-horse1", CLIENT_IP))
                .isInstanceOf(RegistrationDisabledException.class);

        verify(userRepository, never()).findByEmail(any());
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void isRegistrationEnabledReflectsTheConfiguredFlag() {
        assertThat(newAuthService(true).isRegistrationEnabled()).isTrue();
        assertThat(newAuthService(false).isRegistrationEnabled()).isFalse();
    }
}
