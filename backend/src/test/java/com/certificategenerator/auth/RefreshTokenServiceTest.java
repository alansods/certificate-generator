package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class RefreshTokenServiceTest {

    private RefreshTokenRepository repository;
    private RefreshTokenService service;
    private User user;

    @BeforeEach
    void setUp() {
        repository = mock(RefreshTokenRepository.class);
        service = new RefreshTokenService(repository, Duration.ofDays(7));
        user = new User("jane@example.com", "hash", "Jane Doe", Role.USER);
        setId(user, 1L);
    }

    @Test
    void issueSavesAHashedTokenAndReturnsTheRawValue() {
        String rawToken = service.issue(user);

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(repository).save(captor.capture());
        assertThat(rawToken).isNotBlank();
        assertThat(captor.getValue().getTokenHash()).isNotEqualTo(rawToken);
        assertThat(captor.getValue().getUser()).isEqualTo(user);
    }

    @Test
    void rotateRevokesTheOldTokenAndIssuesANewOne() {
        RefreshToken existing = issueAndCapture();
        when(repository.findByTokenHash(any())).thenReturn(Optional.of(existing));

        RefreshTokenService.RotationResult result = service.rotate("raw-token-placeholder");

        assertThat(existing.isRevoked()).isTrue();
        assertThat(result.user()).isEqualTo(user);
        assertThat(result.rawRefreshToken()).isNotBlank();
        verify(repository, times(2)).save(any());
    }

    @Test
    void rotateWithUnknownTokenThrowsAndDoesNotRevokeAnything() {
        when(repository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotate("does-not-exist"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(repository, never()).revokeAllForUser(any(), any());
    }

    @Test
    void rotateWithAlreadyRevokedTokenDetectsTheftAndRevokesTheWholeFamily() {
        RefreshToken existing = issueAndCapture();
        existing.revoke();
        when(repository.findByTokenHash(any())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.rotate("stolen-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(repository).revokeAllForUser(eq(user), any(Instant.class));
    }

    @Test
    void rotateWithExpiredTokenThrows() {
        RefreshToken expired = new RefreshToken(user, "some-hash", Instant.now().minusSeconds(1));
        when(repository.findByTokenHash(any())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.rotate("expired-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void revokeMarksTheMatchingTokenRevoked() {
        RefreshToken existing = issueAndCapture();
        when(repository.findByTokenHash(any())).thenReturn(Optional.of(existing));

        service.revoke("raw-token-placeholder");

        assertThat(existing.isRevoked()).isTrue();
    }

    @Test
    void revokeAllExceptRevokesEveryOtherTokenButKeepsTheGivenOne() {
        RefreshToken kept = issueAndCapture();
        when(repository.findByTokenHash(any())).thenReturn(Optional.of(kept));

        service.revokeAllExcept(user, "kept-raw-token");

        ArgumentCaptor<String> keptHashCaptor = ArgumentCaptor.forClass(String.class);
        verify(repository)
                .revokeAllForUserExceptTokenHash(eq(user), keptHashCaptor.capture(), any(Instant.class));
        assertThat(keptHashCaptor.getValue()).isEqualTo(kept.getTokenHash());
    }

    @Test
    void revokeAllExceptThrowsWhenTheKeptTokenIsUnknown() {
        when(repository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.revokeAllExcept(user, "does-not-exist"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(repository, never()).revokeAllForUserExceptTokenHash(any(), any(), any());
    }

    @Test
    void revokeAllExceptThrowsWhenTheKeptTokenBelongsToSomeoneElse() {
        User otherUser = new User("other@example.com", "hash", "Other", Role.USER);
        setId(otherUser, 2L);
        RefreshToken foreignToken = new RefreshToken(otherUser, "some-hash", Instant.now().plusSeconds(60));
        when(repository.findByTokenHash(any())).thenReturn(Optional.of(foreignToken));

        assertThatThrownBy(() -> service.revokeAllExcept(user, "someone-elses-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(repository, never()).revokeAllForUserExceptTokenHash(any(), any(), any());
    }

    @Test
    void revokeAllExceptThrowsWhenTheKeptTokenIsAlreadyRevoked() {
        RefreshToken revoked = issueAndCapture();
        revoked.revoke();
        when(repository.findByTokenHash(any())).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> service.revokeAllExcept(user, "already-revoked"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(repository, never()).revokeAllForUserExceptTokenHash(any(), any(), any());
    }

    private RefreshToken issueAndCapture() {
        service.issue(user);
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(repository, times(1)).save(captor.capture());
        return captor.getValue();
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
