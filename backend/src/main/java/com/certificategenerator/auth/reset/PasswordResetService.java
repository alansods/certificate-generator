package com.certificategenerator.auth.reset;

import com.certificategenerator.auth.RateLimitExceededException;
import com.certificategenerator.auth.RateLimiter;
import com.certificategenerator.auth.RefreshTokenService;
import com.certificategenerator.auth.User;
import com.certificategenerator.auth.UserRepository;
import com.certificategenerator.mail.MailSender;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

/**
 * Requests and completes password resets. Kept separate from {@link
 * com.certificategenerator.auth.AuthService} (whose constructor already carries a dozen rate-limit
 * parameters) per proposal.md's Impact section.
 */
@Service
public class PasswordResetService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32; // 256 bits
    private static final Duration TOKEN_TTL = Duration.ofMinutes(30);

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final MailSender mailSender;
    private final TemplateEngine templateEngine;
    private final RateLimiter rateLimiter;
    private final String frontendBaseUrl;
    private final int requestMaxAttemptsPerIp;
    private final Duration requestWindowPerIp;
    private final int requestMaxAttemptsPerEmail;
    private final Duration requestWindowPerEmail;
    private final int completeMaxAttemptsPerIp;
    private final Duration completeWindowPerIp;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            RefreshTokenService refreshTokenService,
            MailSender mailSender,
            TemplateEngine templateEngine,
            RateLimiter rateLimiter,
            @Value("${app.frontend-base-url:}") String frontendBaseUrl,
            @Value("${app.rate-limit.password-reset-request-ip.max-attempts}") int requestMaxAttemptsPerIp,
            @Value("${app.rate-limit.password-reset-request-ip.window}") Duration requestWindowPerIp,
            @Value("${app.rate-limit.password-reset-request-email.max-attempts}")
                    int requestMaxAttemptsPerEmail,
            @Value("${app.rate-limit.password-reset-request-email.window}") Duration requestWindowPerEmail,
            @Value("${app.rate-limit.password-reset-complete.max-attempts}") int completeMaxAttemptsPerIp,
            @Value("${app.rate-limit.password-reset-complete.window}") Duration completeWindowPerIp) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.rateLimiter = rateLimiter;
        this.frontendBaseUrl = frontendBaseUrl;
        this.requestMaxAttemptsPerIp = requestMaxAttemptsPerIp;
        this.requestWindowPerIp = requestWindowPerIp;
        this.requestMaxAttemptsPerEmail = requestMaxAttemptsPerEmail;
        this.requestWindowPerEmail = requestWindowPerEmail;
        this.completeMaxAttemptsPerIp = completeMaxAttemptsPerIp;
        this.completeWindowPerIp = completeWindowPerIp;
    }

    /**
     * Always completes without revealing whether the email matched an account — see design.md
     * "Always answering 202". Both rate-limit buckets record every attempt (not just failures):
     * unlike a login, a "success" here proves nothing about the address, so counting only
     * failures would let an attacker rotate through candidate addresses at full speed.
     */
    @Transactional
    public void requestReset(String email, String clientIp) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        String ipKey = "password-reset-request:ip:" + clientIp;
        String emailKey = "password-reset-request:email:" + normalizedEmail;
        if (rateLimiter.isBlocked(ipKey, requestMaxAttemptsPerIp, requestWindowPerIp)
                || rateLimiter.isBlocked(emailKey, requestMaxAttemptsPerEmail, requestWindowPerEmail)) {
            throw new RateLimitExceededException("Too many password reset requests, try again later");
        }
        rateLimiter.recordFailure(ipKey, requestWindowPerIp);
        rateLimiter.recordFailure(emailKey, requestWindowPerEmail);

        Optional<User> user = userRepository.findByEmail(normalizedEmail).filter(User::isEnabled);
        if (user.isEmpty()) {
            return;
        }

        // A fresh request invalidates whatever request preceded it, so the newest link in the
        // inbox is always the one that works.
        tokenRepository.deleteUnusedForUser(user.get());

        String rawToken = generateRawToken();
        tokenRepository.save(new PasswordResetToken(user.get(), hash(rawToken), Instant.now().plus(TOKEN_TTL)));

        sendResetEmail(normalizedEmail, rawToken);
    }

    /**
     * Revokes every session for the user with no exception for the caller — see design.md
     * "Revoking sessions on reset". Rate limited per IP; every attempt counts, valid or not, for
     * the same reason as {@link #requestReset}.
     */
    @Transactional
    public void completeReset(String rawToken, String newPassword, String clientIp) {
        String ipKey = "password-reset-complete:" + clientIp;
        if (rateLimiter.isBlocked(ipKey, completeMaxAttemptsPerIp, completeWindowPerIp)) {
            throw new RateLimitExceededException("Too many password reset attempts, try again later");
        }
        rateLimiter.recordFailure(ipKey, completeWindowPerIp);

        PasswordResetToken token =
                tokenRepository
                        .findByTokenHash(hash(rawToken))
                        .filter(t -> !t.isUsed() && t.getExpiresAt().isAfter(Instant.now()))
                        .orElseThrow(
                                () ->
                                        new InvalidPasswordResetTokenException(
                                                "This reset link is invalid or has expired"));

        User user = token.getUser();
        user.changePassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        token.markUsed();
        tokenRepository.save(token);
        refreshTokenService.revokeAll(user);
    }

    private void sendResetEmail(String email, String rawToken) {
        // Built only from configuration, never from the request's Host header — see design.md
        // "Building the link", the single most important line in this change to get right.
        String resetLink = frontendBaseUrl + "/reset-password?token=" + rawToken;
        Context context = new Context();
        context.setVariable("resetLink", resetLink);
        String htmlBody = templateEngine.process("mail/password-reset", context);
        mailSender.send(email, "Reset your Certificate Generator password", htmlBody);
    }

    // Package-private (not private) so PasswordResetIntegrationTest, in this same package, can
    // construct a token with a controlled hash/expiry directly through the repository to exercise
    // the expired- and unknown-token scenarios without waiting 30 real minutes.
    static String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
