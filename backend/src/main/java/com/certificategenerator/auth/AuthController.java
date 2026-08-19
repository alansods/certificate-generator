package com.certificategenerator.auth;

import com.certificategenerator.auth.dto.LoginRequest;
import com.certificategenerator.auth.dto.RefreshRequest;
import com.certificategenerator.auth.dto.TokenPairResponse;
import com.certificategenerator.auth.dto.UserResponse;
import com.certificategenerator.web.ClientIpResolver;
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
    private final ClientIpResolver clientIpResolver;

    public AuthController(
            AuthService authService, UserMapper userMapper, ClientIpResolver clientIpResolver) {
        this.authService = authService;
        this.userMapper = userMapper;
        this.clientIpResolver = clientIpResolver;
    }

    @PostMapping("/login")
    public TokenPairResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(request.email(), request.password(), clientIpResolver.resolve(httpRequest));
    }

    @PostMapping("/refresh")
    public TokenPairResponse refresh(
            @Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        return authService.refresh(request.refreshToken(), clientIpResolver.resolve(httpRequest));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        authService.logout(request.refreshToken(), clientIpResolver.resolve(httpRequest));
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedPrincipal principal) {
        return userMapper.toResponse(authService.requireById(principal.userId()));
    }
}
