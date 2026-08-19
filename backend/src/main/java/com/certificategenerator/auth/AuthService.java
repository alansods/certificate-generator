package com.certificategenerator.auth;

import com.certificategenerator.auth.dto.TokenPairResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final RateLimiter rateLimiter;
    private final int loginMaxAttempts;
    private final Duration loginWindow;
    private final int refreshMaxAttempts;
    private final Duration refreshWindow;
    private final int logoutMaxAttempts;
    private final Duration logoutWindow;
    private final String dummyPasswordHash;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            RateLimiter rateLimiter,
            @Value("${app.rate-limit.login.max-attempts}") int loginMaxAttempts,
            @Value("${app.rate-limit.login.window}") Duration loginWindow,
            @Value("${app.rate-limit.refresh.max-attempts}") int refreshMaxAttempts,
            @Value("${app.rate-limit.refresh.window}") Duration refreshWindow,
            @Value("${app.rate-limit.logout.max-attempts}") int logoutMaxAttempts,
            @Value("${app.rate-limit.logout.window}") Duration logoutWindow) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.rateLimiter = rateLimiter;
        this.loginMaxAttempts = loginMaxAttempts;
        this.loginWindow = loginWindow;
        this.refreshMaxAttempts = refreshMaxAttempts;
        this.refreshWindow = refreshWindow;
        this.logoutMaxAttempts = logoutMaxAttempts;
        this.logoutWindow = logoutWindow;
        // Encoded once so login() below always pays the same BCrypt cost whether or not the
        // email exists, closing the timing side-channel a short-circuited check would otherwise
        // create (matches() only running for real users would let response time reveal which
        // emails are registered, even though the response body/status are identical either way).
        this.dummyPasswordHash = passwordEncoder.encode("dummy-password-for-timing-normalization");
    }

    public TokenPairResponse login(String email, String password, String clientIp) {
        String rateLimitKey = "login:" + email + ":" + clientIp;
        if (rateLimiter.isBlocked(rateLimitKey, loginMaxAttempts, loginWindow)) {
            throw new RateLimitExceededException("Too many login attempts, try again later");
        }

        User user = userRepository.findByEmail(email).orElse(null);
        String hashToCheck = user != null ? user.getPasswordHash() : dummyPasswordHash;
        boolean passwordMatches = passwordEncoder.matches(password, hashToCheck);
        if (user == null || !user.isEnabled() || !passwordMatches) {
            rateLimiter.recordFailure(rateLimitKey, loginWindow);
            throw new InvalidCredentialsException("Invalid email or password");
        }

        rateLimiter.clear(rateLimitKey);
        return issueTokenPair(user);
    }

    public TokenPairResponse refresh(String rawRefreshToken, String clientIp) {
        String rateLimitKey = "refresh:" + clientIp;
        if (rateLimiter.isBlocked(rateLimitKey, refreshMaxAttempts, refreshWindow)) {
            throw new RateLimitExceededException("Too many refresh attempts, try again later");
        }

        try {
            RefreshTokenService.RotationResult result = refreshTokenService.rotate(rawRefreshToken);
            rateLimiter.clear(rateLimitKey);
            String accessToken = jwtService.issueAccessToken(result.user());
            return new TokenPairResponse(
                    accessToken, result.rawRefreshToken(), jwtService.accessTokenTtlSeconds());
        } catch (InvalidRefreshTokenException e) {
            rateLimiter.recordFailure(rateLimitKey, refreshWindow);
            throw e;
        }
    }

    /**
     * Rate limited per client IP because logout is unauthenticated — the refresh token in the
     * body is the credential (see SecurityConfig), which leaves this the only anonymous endpoint
     * that touches the database. Only a token that matches nothing counts against the bucket, so
     * a real user signing out of several sessions never spends it.
     */
    public void logout(String rawRefreshToken, String clientIp) {
        String rateLimitKey = "logout:" + clientIp;
        if (rateLimiter.isBlocked(rateLimitKey, logoutMaxAttempts, logoutWindow)) {
            throw new RateLimitExceededException("Too many logout attempts, try again later");
        }
        if (refreshTokenService.revoke(rawRefreshToken)) {
            rateLimiter.clear(rateLimitKey);
        } else {
            rateLimiter.recordFailure(rateLimitKey, logoutWindow);
        }
    }

    public User requireById(Long userId) {
        return userRepository
                .findById(userId)
                .orElseThrow(() -> new InvalidCredentialsException("User no longer exists"));
    }

    private TokenPairResponse issueTokenPair(User user) {
        String accessToken = jwtService.issueAccessToken(user);
        String refreshToken = refreshTokenService.issue(user);
        return new TokenPairResponse(accessToken, refreshToken, jwtService.accessTokenTtlSeconds());
    }
}
