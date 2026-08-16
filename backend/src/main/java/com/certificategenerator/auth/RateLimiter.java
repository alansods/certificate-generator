package com.certificategenerator.auth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import org.springframework.stereotype.Component;

/**
 * In-memory sliding-window limiter, per design.md: acceptable because Render free tier runs a
 * single instance. Resets on restart/redeploy — a fine tradeoff for a low-traffic internal tool.
 * Revisit (e.g. Redis-backed) only if the app ever runs more than one instance.
 *
 * <p>Backed by a bounded Caffeine cache rather than a plain map: every login/refresh key is
 * attacker-controlled to some degree (the email in particular), so an unbounded map would let an
 * attacker exhaust heap by cycling through fake keys. {@code maximumSize} caps that;
 * {@code expireAfterAccess} reclaims keys nobody has touched recently, independent of whether
 * {@link #isBlocked} or {@link #clear} is ever called again for them.
 */
@Component
public class RateLimiter {

    private static final long MAX_TRACKED_KEYS = 50_000;
    private static final Duration EVICT_AFTER = Duration.ofHours(1);

    private final Cache<String, Deque<Instant>> attemptsByKey =
            Caffeine.newBuilder().maximumSize(MAX_TRACKED_KEYS).expireAfterAccess(EVICT_AFTER).build();

    public boolean isBlocked(String key, int maxAttempts, Duration window) {
        Deque<Instant> attempts = attemptsByKey.getIfPresent(key);
        if (attempts == null) {
            return false;
        }
        synchronized (attempts) {
            prune(attempts, window);
            return attempts.size() >= maxAttempts;
        }
    }

    public void recordFailure(String key, Duration window) {
        Deque<Instant> attempts = attemptsByKey.get(key, k -> new ArrayDeque<>());
        synchronized (attempts) {
            prune(attempts, window);
            attempts.addLast(Instant.now());
        }
    }

    public void clear(String key) {
        attemptsByKey.invalidate(key);
    }

    private static void prune(Deque<Instant> attempts, Duration window) {
        Instant cutoff = Instant.now().minus(window);
        while (!attempts.isEmpty() && attempts.peekFirst().isBefore(cutoff)) {
            attempts.pollFirst();
        }
    }
}
