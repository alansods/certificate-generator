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

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            RateLimiter rateLimiter,
            @Value("${app.rate-limit.login.max-attempts}") int loginMaxAttempts,
            @Value("${app.rate-limit.login.window}") Duration loginWindow,
            @Value("${app.rate-limit.refresh.max-attempts}") int refreshMaxAttempts,
            @Value("${app.rate-limit.refresh.window}") Duration refreshWindow) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.rateLimiter = rateLimiter;
        this.loginMaxAttempts = loginMaxAttempts;
        this.loginWindow = loginWindow;
        this.refreshMaxAttempts = refreshMaxAttempts;
        this.refreshWindow = refreshWindow;
    }

    public TokenPairResponse login(String email, String password, String clientIp) {
        String rateLimitKey = "login:" + email + ":" + clientIp;
        if (rateLimiter.isBlocked(rateLimitKey, loginMaxAttempts, loginWindow)) {
            throw new RateLimitExceededException("Too many login attempts, try again later");
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !user.isEnabled() || !passwordEncoder.matches(password, user.getPasswordHash())) {
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

    public void logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
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
