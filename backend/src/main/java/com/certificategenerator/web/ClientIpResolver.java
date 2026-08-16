package com.certificategenerator.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/**
 * Deliberately ignores X-Forwarded-For: any direct API caller (not just browsers) can set it to
 * an arbitrary value, which would let an attacker mint a fresh rate-limit bucket on every request
 * and defeat rate limiting entirely. {@code getRemoteAddr()} is the TCP peer address and isn't
 * spoofable by the request itself. Once deployed behind Render's proxy (chore/deploy-render-neon,
 * 3.2), revisit with a properly configured trusted-proxy boundary (e.g. Tomcat's RemoteIpValve
 * pinned to Render's internal proxy range) rather than trusting the header outright.
 */
@Component
public class ClientIpResolver {

    public String resolve(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
