package com.certificategenerator.auth;

import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.RefreshRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
import com.certificategenerator.auth.dto.UserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final UserMapper userMapper;

    public AuthController(AuthService authService, UserMapper userMapper) {
        this.authService = authService;
        this.userMapper = userMapper;
    }

    @PostMapping("/login")
    public TokenPairResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(request.email(), request.password(), clientIp(httpRequest));
    }

    @PostMapping("/refresh")
    public TokenPairResponse refresh(
            @Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        return authService.refresh(request.refreshToken(), clientIp(httpRequest));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request.refreshToken());
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return userMapper.toResponse(authService.requireById(principal.userId()));
    }

    /**
     * Deliberately ignores X-Forwarded-For: any direct API caller (not just browsers) can set it
     * to an arbitrary value, which would let an attacker mint a fresh rate-limit bucket on every
     * request and defeat the login/refresh rate limits entirely. {@code getRemoteAddr()} is the
     * TCP peer address and isn't spoofable by the request itself. Once deployed behind Render's
     * proxy (chore/deploy-render-neon, 3.2), revisit with a properly configured trusted-proxy
     * boundary (e.g. Tomcat's RemoteIpValve pinned to Render's internal proxy range) rather than
     * trusting the header outright.
     */
    private static String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
