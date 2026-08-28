package com.certificategenerator.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Issues, rotates and revokes opaque refresh tokens. Only the SHA-256 hash of a token is ever
 * persisted or logged, per openspec/specs/auth/spec.md's "Refresh token storage" requirement.
 * Presenting an already-revoked token is treated as a theft signal: every other unrevoked token
 * for that user is revoked too, per the spec's "Refresh token theft detection" requirement.
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32; // 256 bits

    private final RefreshTokenRepository refreshTokenRepository;
    private final Duration refreshTokenTtl;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${app.refresh-token.ttl:P7D}") Duration refreshTokenTtl) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenTtl = refreshTokenTtl;
    }

    @Transactional
    public String issue(User user) {
        String rawToken = generateRawToken();
        RefreshToken entity =
                new RefreshToken(user, hash(rawToken), Instant.now().plus(refreshTokenTtl));
        refreshTokenRepository.save(entity);
        return rawToken;
    }

    /**
     * Rotates a valid refresh token: revokes it and issues a new one for the same user.
     *
     * <p>{@code noRollbackFor} matters here: the theft-detection branch below revokes the user's
     * whole token family and then throws to signal the caller — a default rollback would undo
     * that very revocation, silently defeating the theft protection.
     */
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public RotationResult rotate(String rawToken) {
        RefreshToken existing = findByRawTokenOrThrow(rawToken);

        if (existing.isRevoked()) {
            log.warn(
                    "Refresh token reuse detected for user {}; revoking all sessions",
                    existing.getUser().getId());
            refreshTokenRepository.revokeAllForUser(existing.getUser(), Instant.now());
            throw new InvalidRefreshTokenException("Refresh token already used");
        }
        if (existing.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidRefreshTokenException("Refresh token expired");
        }

        existing.revoke();
        try {
            // Flushed immediately (rather than left to commit) so a concurrent rotate() of the
            // same token loses the optimistic-lock race right here, inside this try block,
            // instead of surfacing later as an uncaught exception at transaction commit.
            refreshTokenRepository.saveAndFlush(existing);
        } catch (OptimisticLockingFailureException e) {
            throw new InvalidRefreshTokenException("Refresh token already used");
        }

        String newRawToken = issue(existing.getUser());
        return new RotationResult(existing.getUser(), newRawToken);
    }

    @Transactional
    /** Returns whether a stored token actually matched, so the caller can tell a real sign-out
     * from a probe without the response ever distinguishing them. */
    public boolean revoke(String rawToken) {
        return refreshTokenRepository
                .findByTokenHash(hash(rawToken))
                .map(
                        token -> {
                            token.revoke();
                            return true;
                        })
                .orElse(false);
    }

    /**
     * Revokes every refresh token for {@code user} except the one the caller is currently using,
     * so a password change actually ends other sessions rather than only appearing to (see
     * design.md "Why the password change revokes other sessions").
     *
     * <p>Looks the kept token up first and requires it to be a live, unrevoked, unexpired token
     * belonging to {@code user}: without this, a stale or mismatched token would silently match
     * nothing in the bulk update below, and "except" would revoke every session, including the
     * caller's own.
     */
    @Transactional
    public void revokeAllExcept(User user, String rawTokenToKeep) {
        RefreshToken kept =
                refreshTokenRepository
                        .findByTokenHash(hash(rawTokenToKeep))
                        .filter(
                                token ->
                                        token.getUser().getId().equals(user.getId())
                                                && !token.isRevoked()
                                                && token.getExpiresAt().isAfter(Instant.now()))
                        .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token not found"));
        refreshTokenRepository.revokeAllForUserExceptTokenHash(
                user, kept.getTokenHash(), Instant.now());
    }

    private RefreshToken findByRawTokenOrThrow(String rawToken) {
        return refreshTokenRepository
                .findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token not found"));
    }

    private static String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public record RotationResult(User user, String rawRefreshToken) {}
}
