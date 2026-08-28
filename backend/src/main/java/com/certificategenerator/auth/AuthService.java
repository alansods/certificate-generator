package com.certificategenerator.auth;

import com.certificategenerator.auth.dto.TokenPairResponse;
import com.certificategenerator.auth.dto.UserResponse;
import java.time.Duration;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserMapper userMapper;
    private final RateLimiter rateLimiter;
    private final int loginMaxAttempts;
    private final Duration loginWindow;
    private final int refreshMaxAttempts;
    private final Duration refreshWindow;
    private final int logoutMaxAttempts;
    private final Duration logoutWindow;
    private final int passwordChangeMaxAttempts;
    private final Duration passwordChangeWindow;
    private final int profileUpdateMaxAttempts;
    private final Duration profileUpdateWindow;
    private final int registerMaxAttempts;
    private final Duration registerWindow;
    private final boolean registrationEnabled;
    private final String dummyPasswordHash;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            UserMapper userMapper,
            RateLimiter rateLimiter,
            @Value("${app.rate-limit.login.max-attempts}") int loginMaxAttempts,
            @Value("${app.rate-limit.login.window}") Duration loginWindow,
            @Value("${app.rate-limit.refresh.max-attempts}") int refreshMaxAttempts,
            @Value("${app.rate-limit.refresh.window}") Duration refreshWindow,
            @Value("${app.rate-limit.logout.max-attempts}") int logoutMaxAttempts,
            @Value("${app.rate-limit.logout.window}") Duration logoutWindow,
            @Value("${app.rate-limit.password-change.max-attempts}") int passwordChangeMaxAttempts,
            @Value("${app.rate-limit.password-change.window}") Duration passwordChangeWindow,
            @Value("${app.rate-limit.profile-update.max-attempts}") int profileUpdateMaxAttempts,
            @Value("${app.rate-limit.profile-update.window}") Duration profileUpdateWindow,
            @Value("${app.rate-limit.register.max-attempts}") int registerMaxAttempts,
            @Value("${app.rate-limit.register.window}") Duration registerWindow,
            @Value("${app.auth.registration-enabled}") boolean registrationEnabled) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.userMapper = userMapper;
        this.rateLimiter = rateLimiter;
        this.loginMaxAttempts = loginMaxAttempts;
        this.loginWindow = loginWindow;
        this.refreshMaxAttempts = refreshMaxAttempts;
        this.refreshWindow = refreshWindow;
        this.logoutMaxAttempts = logoutMaxAttempts;
        this.logoutWindow = logoutWindow;
        this.passwordChangeMaxAttempts = passwordChangeMaxAttempts;
        this.passwordChangeWindow = passwordChangeWindow;
        this.profileUpdateMaxAttempts = profileUpdateMaxAttempts;
        this.profileUpdateWindow = profileUpdateWindow;
        this.registerMaxAttempts = registerMaxAttempts;
        this.registerWindow = registerWindow;
        this.registrationEnabled = registrationEnabled;
        // Encoded once so login() below always pays the same BCrypt cost whether or not the
        // email exists, closing the timing side-channel a short-circuited check would otherwise
        // create (matches() only running for real users would let response time reveal which
        // emails are registered, even though the response body/status are identical either way).
        this.dummyPasswordHash = passwordEncoder.encode("dummy-password-for-timing-normalization");
    }

    public TokenPairResponse login(String email, String password, String clientIp) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        String rateLimitKey = "login:" + normalizedEmail + ":" + clientIp;
        if (rateLimiter.isBlocked(rateLimitKey, loginMaxAttempts, loginWindow)) {
            throw new RateLimitExceededException("Too many login attempts, try again later");
        }

        User user = userRepository.findByEmail(normalizedEmail).orElse(null);
        String hashToCheck = user != null ? user.getPasswordHash() : dummyPasswordHash;
        boolean passwordMatches = passwordEncoder.matches(password, hashToCheck);
        if (user == null || !user.isEnabled() || !passwordMatches) {
            rateLimiter.recordFailure(rateLimitKey, loginWindow);
            throw new InvalidCredentialsException("Invalid email or password");
        }

        rateLimiter.clear(rateLimitKey);
        return issueTokenPair(user);
    }

    public boolean isRegistrationEnabled() {
        return registrationEnabled;
    }

    /**
     * Rate limited per client IP (unauthenticated, like login) rather than per email: an
     * unauthenticated caller can supply any email, so keying on it would let an attacker reset
     * their own bucket by rotating the address on every probe. See design.md "Account-existence
     * disclosure" for why a duplicate email is reported as 409 rather than hidden. Unlike
     * login/refresh/password-change/profile-update, this bucket counts EVERY attempt, including
     * success: a successful registration proves nothing about a probed email the way a successful
     * login proves the credential presented was real, so clearing the bucket on success would let
     * an attacker probe a candidate email, register a fresh throwaway account to reset the
     * counter, and repeat indefinitely — defeating both the rate limit and the 409-email-oracle
     * mitigation it exists to bound.
     */
    @Transactional
    public TokenPairResponse register(String fullName, String email, String password, String clientIp) {
        if (!registrationEnabled) {
            throw new RegistrationDisabledException("Self-registration is disabled");
        }
        String rateLimitKey = "register:" + clientIp;
        if (rateLimiter.isBlocked(rateLimitKey, registerMaxAttempts, registerWindow)) {
            throw new RateLimitExceededException("Too many registration attempts, try again later");
        }
        rateLimiter.recordFailure(rateLimitKey, registerWindow);

        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new EmailAlreadyRegisteredException("Email is already registered to another account");
        }

        User user = new User(normalizedEmail, passwordEncoder.encode(password), fullName.trim(), Role.USER);
        User saved;
        try {
            saved = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Same TOCTOU as updateProfile: the check above and this insert aren't atomic.
            throw new EmailAlreadyRegisteredException("Email is already registered to another account");
        }
        return issueTokenPair(saved);
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

    @Transactional(readOnly = true)
    public User requireById(Long userId) {
        return userRepository
                .findById(userId)
                .orElseThrow(() -> new InvalidCredentialsException("User no longer exists"));
    }

    /**
     * Rate limited per user: an authenticated caller could otherwise use the 409-vs-200 response
     * as an unbounded email-enumeration oracle, resetting their own email between probes. Unlike
     * the login/refresh/password-change buckets, success here does NOT clear the counter: a
     * successful update with the caller's own real email proves nothing about a probed email, so
     * clearing on success would let an attacker interleave a legitimate request with a probe to
     * reset the counter indefinitely.
     */
    @Transactional
    public UserResponse updateProfile(Long userId, String fullName, String email) {
        String rateLimitKey = "profile-update:" + userId;
        if (rateLimiter.isBlocked(rateLimitKey, profileUpdateMaxAttempts, profileUpdateWindow)) {
            throw new RateLimitExceededException("Too many profile update attempts, try again later");
        }

        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmailAndIdNot(normalizedEmail, userId).isPresent()) {
            // The 409 itself is spec'd; what's bounded here is repeatedly hitting it, which is
            // exactly the signal an email-enumeration probe produces.
            rateLimiter.recordFailure(rateLimitKey, profileUpdateWindow);
            throw new EmailAlreadyRegisteredException("Email is already registered to another account");
        }
        User user = requireById(userId);
        user.updateProfile(fullName, normalizedEmail);
        try {
            User saved = userRepository.saveAndFlush(user);
            return userMapper.toResponse(saved);
        } catch (DataIntegrityViolationException e) {
            // The uniqueness check above and this save aren't atomic; a concurrent update
            // claiming the same email can slip through both. The unique index is the real
            // guard — this just turns its violation into the same 409 the checked path returns.
            // saveAndFlush (rather than save) is what makes this catch reachable at all: save()
            // on an already-managed entity is a no-op merge, so the constraint violation would
            // otherwise surface at commit time, outside this try block.
            rateLimiter.recordFailure(rateLimitKey, profileUpdateWindow);
            throw new EmailAlreadyRegisteredException("Email is already registered to another account");
        }
    }

    /**
     * Requires the current password even though the caller is already authenticated — see
     * design.md "Requiring the current password". Revokes every other refresh token for the
     * user, keeping only the one the caller presented (design.md "Why the password change
     * revokes other sessions"). Rate limited per user: unlike login, a stolen access token would
     * otherwise let an attacker brute-force currentPassword at an unbounded rate.
     */
    @Transactional
    public void changePassword(
            Long userId, String currentPassword, String newPassword, String rawRefreshToken) {
        String rateLimitKey = "password-change:" + userId;
        if (rateLimiter.isBlocked(rateLimitKey, passwordChangeMaxAttempts, passwordChangeWindow)) {
            throw new RateLimitExceededException("Too many password change attempts, try again later");
        }

        User user = requireById(userId);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            rateLimiter.recordFailure(rateLimitKey, passwordChangeWindow);
            throw new InvalidCurrentPasswordException("Current password is incorrect");
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new NewPasswordSameAsCurrentException("New password must be different from the current one");
        }

        user.changePassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        try {
            refreshTokenService.revokeAllExcept(user, rawRefreshToken);
        } catch (InvalidRefreshTokenException e) {
            // The caller's access token is perfectly valid here — only the refresh token supplied
            // alongside it is bad (unknown, revoked, or belongs to someone else). Rethrown as a
            // 400 field error rather than letting InvalidRefreshTokenException's usual 401 mapping
            // through, which would make the frontend's refresh-and-retry interceptor loop
            // pointlessly on a token that was never the access credential for this request.
            throw new InvalidRefreshTokenForPasswordChangeException(e.getMessage());
        }
        // Cleared only after every step succeeds: this counter is in-memory, not transactional,
        // so clearing it earlier would survive a rollback triggered by the refresh-token check
        // above.
        rateLimiter.clear(rateLimitKey);
    }

    private TokenPairResponse issueTokenPair(User user) {
        String accessToken = jwtService.issueAccessToken(user);
        String refreshToken = refreshTokenService.issue(user);
        return new TokenPairResponse(accessToken, refreshToken, jwtService.accessTokenTtlSeconds());
    }
}
