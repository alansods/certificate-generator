package com.certificategenerator.verification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.certificategenerator.auth.RateLimiter;
import com.certificategenerator.certificate.CertificateStatus;
import com.certificategenerator.verification.dto.CertificateVerificationResponse;
import com.certificategenerator.web.ClientIpResolver;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Slice test focused on status codes and mapping, not the real SecurityConfig — see
 * CertificateControllerTest for why security autoconfiguration is excluded here. Anonymous access
 * to this endpoint end to end (against the real filter chain) is covered by
 * VerificationIntegrationTest.
 */
@WebMvcTest(
        controllers = VerificationController.class,
        excludeAutoConfiguration = {
            SecurityFilterAutoConfiguration.class,
            ServletWebSecurityAutoConfiguration.class
        })
@Import({ClientIpResolver.class, RateLimiter.class})
class VerificationControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private VerificationService verificationService;
    @MockitoSpyBean private RateLimiter rateLimiter;

    @Test
    void verifyReturns200WithMinimalBody() {
        when(verificationService.verify("CERT-AAAA-BBBB"))
                .thenReturn(
                        new CertificateVerificationResponse(
                                "Jane Doe",
                                "Advanced Angular",
                                40,
                                LocalDate.of(2026, 5, 15),
                                CertificateStatus.ISSUED));
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result = mvc.get().uri("/api/v1/public/verify/CERT-AAAA-BBBB").exchange();

        assertThat(result).hasStatus(HttpStatus.OK);
        assertThat(result).bodyJson().extractingPath("$.recipientName").isEqualTo("Jane Doe");
        assertThat(result).bodyText().doesNotContain("recipientEmail");
        assertThat(result).bodyText().doesNotContain("\"id\"");
    }

    @Test
    void verifyReturns404WhenServiceThrowsNotFound() {
        when(verificationService.verify("CERT-ZZZZ-ZZZZ"))
                .thenThrow(new CertificateVerificationNotFoundException("CERT-ZZZZ-ZZZZ"));
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result = mvc.get().uri("/api/v1/public/verify/CERT-ZZZZ-ZZZZ").exchange();

        assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void verifyReturns429WhenRateLimited() {
        when(rateLimiter.isBlocked(anyString(), anyInt(), any())).thenReturn(true);
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result = mvc.get().uri("/api/v1/public/verify/CERT-AAAA-BBBB").exchange();

        assertThat(result).hasStatus(HttpStatus.TOO_MANY_REQUESTS);
    }
}
