package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class RateLimiterTest {

    private final RateLimiter rateLimiter = new RateLimiter();

    @Test
    void isNotBlockedUntilThresholdReached() {
        String key = "login:jane@example.com:127.0.0.1";
        Duration window = Duration.ofMinutes(15);

        for (int i = 0; i < 5; i++) {
            assertThat(rateLimiter.isBlocked(key, 5, window)).isFalse();
            rateLimiter.recordFailure(key, window);
        }

        assertThat(rateLimiter.isBlocked(key, 5, window)).isTrue();
    }

    @Test
    void independentKeysDoNotInterfere() {
        Duration window = Duration.ofMinutes(15);
        for (int i = 0; i < 5; i++) {
            rateLimiter.recordFailure("login:victim@example.com:1.1.1.1", window);
        }

        assertThat(rateLimiter.isBlocked("login:victim@example.com:1.1.1.1", 5, window)).isTrue();
        assertThat(rateLimiter.isBlocked("login:victim@example.com:2.2.2.2", 5, window)).isFalse();
    }

    @Test
    void clearResetsTheCounter() {
        String key = "refresh:1.1.1.1";
        Duration window = Duration.ofMinutes(15);
        for (int i = 0; i < 5; i++) {
            rateLimiter.recordFailure(key, window);
        }
        assertThat(rateLimiter.isBlocked(key, 5, window)).isTrue();

        rateLimiter.clear(key);

        assertThat(rateLimiter.isBlocked(key, 5, window)).isFalse();
    }

    @Test
    void oldAttemptsOutsideTheWindowDoNotCount() {
        String key = "refresh:1.1.1.1";
        Duration tinyWindow = Duration.ofMillis(1);
        for (int i = 0; i < 5; i++) {
            rateLimiter.recordFailure(key, tinyWindow);
        }

        sleep(50);

        assertThat(rateLimiter.isBlocked(key, 5, tinyWindow)).isFalse();
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
