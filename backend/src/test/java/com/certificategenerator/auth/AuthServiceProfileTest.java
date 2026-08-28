package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.certificategenerator.auth.dto.UserResponse;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceProfileTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private RefreshTokenService refreshTokenService;
    private AuthService authService;
    private User user;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        when(passwordEncoder.encode(any())).thenReturn("dummy-hash");
        refreshTokenService = mock(RefreshTokenService.class);

        authService =
                new AuthService(
                        userRepository,
                        passwordEncoder,
                        mock(JwtService.class),
                        refreshTokenService,
                        new UserMapper(),
                        new RateLimiter(),
                        5,
                        Duration.ofMinutes(15),
                        5,
                        Duration.ofMinutes(15),
                        30,
                        Duration.ofMinutes(1),
                        5,
                        Duration.ofMinutes(15),
                        20,
                        Duration.ofMinutes(15),
                        10,
                        Duration.ofMinutes(15),
                        true);

        user = new User("jane@example.com", "old-hash", "Jane Doe", Role.USER);
        setId(user, 1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void updateProfilePersistsNameAndEmail() {
        when(userRepository.findByEmailAndIdNot("new@example.com", 1L)).thenReturn(Optional.empty());

        UserResponse updated = authService.updateProfile(1L, "New Name", "new@example.com");

        assertThat(updated.fullName()).isEqualTo("New Name");
        assertThat(updated.email()).isEqualTo("new@example.com");
        assertThat(updated.role()).isEqualTo(Role.USER);
    }

    @Test
    void updateProfileWithAnEmailTakenByAnotherUserThrowsAndSavesNothing() {
        when(userRepository.findByEmailAndIdNot("taken@example.com", 1L))
                .thenReturn(Optional.of(new User("taken@example.com", "hash", "Other", Role.USER)));

        assertThatThrownBy(() -> authService.updateProfile(1L, "New Name", "taken@example.com"))
                .isInstanceOf(EmailAlreadyRegisteredException.class);

        verify(userRepository, never()).save(any());
        verify(userRepository, never()).saveAndFlush(any());
        assertThat(user.getEmail()).isEqualTo("jane@example.com");
    }

    @Test
    void updateProfileNormalizesTheEmailToLowercase() {
        when(userRepository.findByEmailAndIdNot("new@example.com", 1L)).thenReturn(Optional.empty());

        UserResponse updated = authService.updateProfile(1L, "New Name", "  New@Example.COM  ");

        assertThat(updated.email()).isEqualTo("new@example.com");
    }

    @Test
    void updateProfileIsBlockedAfterRepeatedlyProbingTakenEmails() {
        when(userRepository.findByEmailAndIdNot(any(), eq(1L)))
                .thenReturn(Optional.of(new User("taken@example.com", "hash", "Other", Role.USER)));

        for (int i = 0; i < 20; i++) {
            assertThatThrownBy(() -> authService.updateProfile(1L, "New Name", "taken@example.com"))
                    .isInstanceOf(EmailAlreadyRegisteredException.class);
        }

        assertThatThrownBy(() -> authService.updateProfile(1L, "New Name", "taken@example.com"))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void updateProfileTurnsAConcurrentUniqueConstraintViolationIntoTheSameConflict() {
        when(userRepository.findByEmailAndIdNot("new@example.com", 1L)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(() -> authService.updateProfile(1L, "New Name", "new@example.com"))
                .isInstanceOf(EmailAlreadyRegisteredException.class);
    }

    @Test
    void updateProfileDoesNotResetTheRateLimitCounterOnSuccess() {
        // Success here isn't proof of anything the way a correct login is: an attacker could
        // otherwise interleave a probe of a taken email (which fails and records) with a
        // legitimate update of their own real email (which succeeds) to reset the counter
        // indefinitely and get unlimited probes at a low effective rate.
        when(userRepository.findByEmailAndIdNot(eq("taken@example.com"), eq(1L)))
                .thenReturn(Optional.of(new User("taken@example.com", "hash", "Other", Role.USER)));
        when(userRepository.findByEmailAndIdNot(eq("jane@example.com"), eq(1L)))
                .thenReturn(Optional.empty());

        for (int i = 0; i < 19; i++) {
            assertThatThrownBy(() -> authService.updateProfile(1L, "New Name", "taken@example.com"))
                    .isInstanceOf(EmailAlreadyRegisteredException.class);
        }

        // A legitimate, successful update interleaved with the probes above.
        authService.updateProfile(1L, "New Name", "jane@example.com");

        // One more probe should tip the bucket if the successful update above did not clear it.
        assertThatThrownBy(() -> authService.updateProfile(1L, "New Name", "taken@example.com"))
                .isInstanceOf(EmailAlreadyRegisteredException.class);
        assertThatThrownBy(() -> authService.updateProfile(1L, "New Name", "taken@example.com"))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void changePasswordWithTheCorrectCurrentPasswordStoresANewHashAndRevokesOtherSessions() {
        when(passwordEncoder.matches("current-pw", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("new-pw1")).thenReturn("new-hash");

        authService.changePassword(1L, "current-pw", "new-pw1", "kept-refresh-token");

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        verify(userRepository).save(user);
        verify(refreshTokenService).revokeAllExcept(user, "kept-refresh-token");
    }

    @Test
    void changePasswordWithAWrongCurrentPasswordThrowsAndLeavesTheHashUntouched() {
        when(passwordEncoder.matches("wrong", "old-hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.changePassword(1L, "wrong", "new-pw1", "token"))
                .isInstanceOf(InvalidCurrentPasswordException.class);

        assertThat(user.getPasswordHash()).isEqualTo("old-hash");
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).revokeAllExcept(any(), any());
    }

    @Test
    void changePasswordRejectsANewPasswordIdenticalToTheCurrentOne() {
        when(passwordEncoder.matches("current-pw", "old-hash")).thenReturn(true);

        assertThatThrownBy(() -> authService.changePassword(1L, "current-pw", "current-pw", "token"))
                .isInstanceOf(NewPasswordSameAsCurrentException.class);

        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).revokeAllExcept(any(), any());
    }

    @Test
    void changePasswordRethrowsAnInvalidRefreshTokenAsAFieldErrorInsteadOfUnauthorized() {
        when(passwordEncoder.matches("current-pw", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("new-pw1")).thenReturn("new-hash");
        doThrow(new InvalidRefreshTokenException("Refresh token not found"))
                .when(refreshTokenService)
                .revokeAllExcept(any(), any());

        assertThatThrownBy(() -> authService.changePassword(1L, "current-pw", "new-pw1", "bad-token"))
                .isInstanceOf(InvalidRefreshTokenForPasswordChangeException.class);
    }

    @Test
    void changePasswordIsBlockedAfterTheConfiguredNumberOfFailedAttempts() {
        when(passwordEncoder.matches(any(), any())).thenReturn(false);

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> authService.changePassword(1L, "wrong", "new-pw1", "token"))
                    .isInstanceOf(InvalidCurrentPasswordException.class);
        }

        assertThatThrownBy(() -> authService.changePassword(1L, "wrong", "new-pw1", "token"))
                .isInstanceOf(RateLimitExceededException.class);
    }

    private static void setId(User user, Long id) {
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
