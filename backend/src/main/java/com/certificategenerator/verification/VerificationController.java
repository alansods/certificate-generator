package com.certificategenerator.verification;

import com.certificategenerator.verification.dto.CertificateVerificationResponse;
import com.certificategenerator.web.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/verify")
public class VerificationController {

    private final VerificationService verificationService;
    private final ClientIpResolver clientIpResolver;

    public VerificationController(
            VerificationService verificationService, ClientIpResolver clientIpResolver) {
        this.verificationService = verificationService;
        this.clientIpResolver = clientIpResolver;
    }

    @GetMapping("/{code}")
    public CertificateVerificationResponse verify(
            @PathVariable String code, HttpServletRequest httpRequest) {
        return verificationService.verify(code, clientIpResolver.resolve(httpRequest));
    }
}
