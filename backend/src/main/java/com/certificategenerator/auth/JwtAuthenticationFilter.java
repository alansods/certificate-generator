package com.certificategenerator.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Validates a bearer access token and populates the SecurityContext with an
 * {@link AuthenticatedPrincipal}. Leaves the context empty (rather than rejecting the request
 * outright) on a missing or invalid token, so downstream authorization decides the response —
 * public endpoints stay reachable and protected ones fall through to the entry point.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            try {
                Claims claims = jwtService.parseAndValidate(header.substring(BEARER_PREFIX.length()));
                AuthenticatedPrincipal principal =
                        new AuthenticatedPrincipal(
                                Long.valueOf(claims.getSubject()),
                                claims.get("email", String.class),
                                Role.valueOf(claims.get("role", String.class)));
                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + principal.role()));
                var authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException | IllegalArgumentException e) {
                log.debug("Rejected invalid access token: {}", e.getMessage());
            }
        }
        filterChain.doFilter(request, response);
    }
}
