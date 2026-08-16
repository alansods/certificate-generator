package com.certificategenerator.verification;

import com.certificategenerator.auth.RateLimitExceededException;
import com.certificategenerator.auth.RateLimiter;
import com.certificategenerator.certificate.Certificate;
import com.certificategenerator.certificate.CertificateRepository;
import com.certificategenerator.verification.dto.CertificateVerificationResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VerificationService {

    private final CertificateRepository certificateRepository;
    private final RateLimiter rateLimiter;
    private final int maxAttempts;
    private final Duration window;

    public VerificationService(
            CertificateRepository certificateRepository,
            RateLimiter rateLimiter,
            @Value("${app.rate-limit.verify.max-attempts}") int maxAttempts,
            @Value("${app.rate-limit.verify.window}") Duration window) {
        this.certificateRepository = certificateRepository;
        this.rateLimiter = rateLimiter;
        this.maxAttempts = maxAttempts;
        this.window = window;
    }

    @Transactional(readOnly = true)
    public CertificateVerificationResponse verify(String code, String clientIp) {
        String rateLimitKey = "verify:" + clientIp;
        if (rateLimiter.isBlocked(rateLimitKey, maxAttempts, window)) {
            throw new RateLimitExceededException("Too many verification attempts, try again later");
        }
        // Every lookup counts against the budget, not just misses: unlike login/refresh (which
        // only record actual failures, since a correct credential is proof the caller isn't
        // attacking), a *successful* verification here is exactly what a code-enumeration script
        // looks like from the server's point of view, so it must count too.
        rateLimiter.recordFailure(rateLimitKey, window);

        Certificate certificate =
                certificateRepository
                        .findByCode(code)
                        .orElseThrow(() -> new CertificateVerificationNotFoundException(code));
        return new CertificateVerificationResponse(
                certificate.getRecipientName(),
                certificate.getCourseName(),
                certificate.getWorkloadHours(),
                certificate.getIssueDate(),
                certificate.getStatus());
    }
}
