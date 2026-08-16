package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.security.SignatureException;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String VALID_SECRET = "a".repeat(32);

    @Test
    void signsAndParsesAccessTokenClaims() {
        JwtService jwtService = new JwtService(VALID_SECRET, Duration.ofMinutes(15));
        User user = new User("jane@example.com", "hash", "Jane Doe", Role.ADMIN);
        setId(user, 42L);

        String token = jwtService.issueAccessToken(user);
        Claims claims = jwtService.parseAndValidate(token);

        assertThat(claims.getSubject()).isEqualTo("42");
        assertThat(claims.get("email", String.class)).isEqualTo("jane@example.com");
        assertThat(claims.get("role", String.class)).isEqualTo("ADMIN");
    }

    @Test
    void rejectsTokenSignedWithADifferentKey() {
        JwtService issuer = new JwtService(VALID_SECRET, Duration.ofMinutes(15));
        JwtService verifier = new JwtService("b".repeat(32), Duration.ofMinutes(15));
        User user = new User("jane@example.com", "hash", "Jane Doe", Role.USER);
        setId(user, 1L);

        String token = issuer.issueAccessToken(user);

        assertThatThrownBy(() -> verifier.parseAndValidate(token))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    void rejectsExpiredToken() throws InterruptedException {
        JwtService jwtService = new JwtService(VALID_SECRET, Duration.ofMillis(1));
        User user = new User("jane@example.com", "hash", "Jane Doe", Role.USER);
        setId(user, 1L);

        String token = jwtService.issueAccessToken(user);
        Thread.sleep(50);

        assertThatThrownBy(() -> jwtService.parseAndValidate(token))
                .isInstanceOf(io.jsonwebtoken.ExpiredJwtException.class);
    }

    @Test
    void rejectsSecretShorterThan256Bits() {
        assertThatThrownBy(() -> new JwtService("too-short", Duration.ofMinutes(15)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("256 bits");
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
