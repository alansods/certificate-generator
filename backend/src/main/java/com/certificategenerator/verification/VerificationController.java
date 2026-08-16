package com.certificategenerator.verification;

import com.certificategenerator.auth.RateLimitExceededException;
import com.certificategenerator.auth.RateLimiter;
import com.certificategenerator.verification.dto.CertificateVerificationResponse;
import com.certificategenerator.web.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/verify")
public class VerificationController {

    private final VerificationService verificationService;
    private final RateLimiter rateLimiter;
    private final ClientIpResolver clientIpResolver;
    private final int maxAttempts;
    private final Duration window;

    public VerificationController(
            VerificationService verificationService,
            RateLimiter rateLimiter,
            ClientIpResolver clientIpResolver,
            @Value("${app.rate-limit.verify.max-attempts}") int maxAttempts,
            @Value("${app.rate-limit.verify.window}") Duration window) {
        this.verificationService = verificationService;
        this.rateLimiter = rateLimiter;
        this.clientIpResolver = clientIpResolver;
        this.maxAttempts = maxAttempts;
        this.window = window;
    }

    @GetMapping("/{code}")
    public CertificateVerificationResponse verify(
            @PathVariable String code, HttpServletRequest httpRequest) {
        String rateLimitKey = "verify:" + clientIpResolver.resolve(httpRequest);
        if (rateLimiter.isBlocked(rateLimitKey, maxAttempts, window)) {
            throw new RateLimitExceededException("Too many verification attempts, try again later");
        }
        rateLimiter.recordFailure(rateLimitKey, window);
        return verificationService.verify(code);
    }
}
