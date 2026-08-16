package com.certificategenerator.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Signs and validates JWT access tokens. Access tokens are never persisted — validity is purely
 * cryptographic plus expiry, per design.md's stateless-until-logout model.
 */
@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32; // 256 bits

    private final SecretKey key;
    private final Duration accessTokenTtl;

    public JwtService(
            @Value("${app.jwt.secret:}") String secret,
            @Value("${app.jwt.access-token-ttl:PT15M}") Duration accessTokenTtl) {
        this.key = deriveKey(secret);
        this.accessTokenTtl = accessTokenTtl;
    }

    private static SecretKey deriveKey(String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "app.jwt.secret (JWT_SECRET) must be at least "
                            + MIN_SECRET_BYTES
                            + " bytes (256 bits); got "
                            + bytes.length);
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    public String issueAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * @throws JwtException if the token is malformed, expired, or fails signature verification
     */
    public Claims parseAndValidate(String token) {
        Jws<Claims> jws = Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
        return jws.getPayload();
    }

    public long accessTokenTtlSeconds() {
        return accessTokenTtl.toSeconds();
    }
}
