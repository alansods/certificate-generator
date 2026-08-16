package com.certificategenerator.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * In-memory sliding-window limiter, per design.md: acceptable because Render free tier runs a
 * single instance. Resets on restart/redeploy — a fine tradeoff for a low-traffic internal tool.
 * Revisit (e.g. Redis-backed) only if the app ever runs more than one instance.
 */
@Component
public class RateLimiter {

    private final Map<String, Deque<Instant>> attemptsByKey = new ConcurrentHashMap<>();

    public boolean isBlocked(String key, int maxAttempts, Duration window) {
        Deque<Instant> attempts = attemptsByKey.get(key);
        if (attempts == null) {
            return false;
        }
        synchronized (attempts) {
            prune(attempts, window);
            return attempts.size() >= maxAttempts;
        }
    }

    public void recordFailure(String key, Duration window) {
        Deque<Instant> attempts = attemptsByKey.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (attempts) {
            prune(attempts, window);
            attempts.addLast(Instant.now());
        }
    }

    public void clear(String key) {
        attemptsByKey.remove(key);
    }

    private static void prune(Deque<Instant> attempts, Duration window) {
        Instant cutoff = Instant.now().minus(window);
        while (!attempts.isEmpty() && attempts.peekFirst().isBefore(cutoff)) {
            attempts.pollFirst();
        }
    }
}
