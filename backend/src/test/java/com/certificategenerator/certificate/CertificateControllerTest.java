package com.certificategenerator.certificate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.certificategenerator.auth.AuthenticatedPrincipal;
import com.certificategenerator.auth.Role;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Slice test focused on status codes and validation, not authorization — the full 401/403 access
 * matrix is already exercised end to end by CertificateIntegrationTest against the real
 * SecurityConfig. Security autoconfiguration is excluded here for the same reason documented on
 * GlobalExceptionHandlerTest/CorsConfigTest, so {@link ArgumentResolverConfig} registers just
 * enough of Spring Security's MVC glue (the @AuthenticationPrincipal resolver) to read the
 * SecurityContext pushed manually in {@link #authenticate()} — without pulling in the real
 * SecurityFilterChain/JWT filter this slice doesn't need.
 */
@WebMvcTest(
        controllers = CertificateController.class,
        excludeAutoConfiguration = {
            SecurityFilterAutoConfiguration.class,
            ServletWebSecurityAutoConfiguration.class
        })
@Import(CertificateMapper.class)
class CertificateControllerTest {

    @TestConfiguration
    static class ArgumentResolverConfig implements WebMvcConfigurer {
        @Override
        public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
            resolvers.add(new AuthenticationPrincipalArgumentResolver());
        }
    }

    @Autowired private MockMvc mockMvc;
    @MockitoBean private CertificateService certificateService;

    @BeforeEach
    void authenticate() {
        AuthenticatedPrincipal principal = new AuthenticatedPrincipal(7L, "jane@example.com", Role.ADMIN);
        var authentication =
                new UsernamePasswordAuthenticationToken(
                        principal, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createWithValidPayloadReturns201() {
        Certificate saved = sampleCertificate();
        when(certificateService.create(any(), eq(7L))).thenReturn(saved);
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result =
                mvc.post()
                        .uri("/api/v1/certificates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload())
                        .exchange();

        assertThat(result).hasStatus(HttpStatus.CREATED);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("CERT-AAAA-BBBB");
    }

    @Test
    void createWithBlankRecipientNameReturns400WithFieldError() {
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result =
                mvc.post()
                        .uri("/api/v1/certificates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload().replace("\"Jane Doe\"", "\"\""))
                        .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(result).bodyJson().extractingPath("$.fieldErrors.recipientName").isNotNull();
    }

    @Test
    void createWithInvalidEmailReturns400() {
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result =
                mvc.post()
                        .uri("/api/v1/certificates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload().replace("jane@example.com", "not-an-email"))
                        .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void createWithNegativeWorkloadHoursReturns400() {
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result =
                mvc.post()
                        .uri("/api/v1/certificates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload().replace("\"workloadHours\":40", "\"workloadHours\":-1"))
                        .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void getReturns200WithTheMappedCertificate() {
        when(certificateService.get(1L)).thenReturn(sampleCertificate());
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result = mvc.get().uri("/api/v1/certificates/1").exchange();

        assertThat(result).hasStatus(HttpStatus.OK);
        assertThat(result).bodyJson().extractingPath("$.recipientName").isEqualTo("Jane Doe");
    }

    @Test
    void getReturns404WhenServiceThrowsNotFound() {
        when(certificateService.get(999L)).thenThrow(new CertificateNotFoundException(999L));
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result = mvc.get().uri("/api/v1/certificates/999").exchange();

        assertThat(result).hasStatus(HttpStatus.NOT_FOUND);
    }

    @Test
    void deleteReturns204() {
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result = mvc.delete().uri("/api/v1/certificates/1").exchange();

        assertThat(result).hasStatus(HttpStatus.NO_CONTENT);
    }

    private static Certificate sampleCertificate() {
        return new Certificate(
                "CERT-AAAA-BBBB",
                "Jane Doe",
                "jane@example.com",
                "Advanced Angular",
                40,
                LocalDate.of(2026, 5, 12),
                LocalDate.of(2026, 5, 15),
                "John Smith",
                CertificateTemplate.CLASSIC,
                CertificateStatus.DRAFT,
                7L);
    }

    private static String validPayload() {
        return "{\"recipientName\":\"Jane Doe\",\"recipientEmail\":\"jane@example.com\","
                + "\"courseName\":\"Advanced Angular\",\"workloadHours\":40,"
                + "\"completionDate\":\"2026-05-12\",\"issueDate\":\"2026-05-15\","
                + "\"instructorName\":\"John Smith\",\"template\":\"CLASSIC\"}";
    }
}
