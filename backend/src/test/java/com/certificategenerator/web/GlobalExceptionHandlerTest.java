package com.certificategenerator.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.web.support.TestExceptionController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

// This slice tests the error-handling advice itself, not authentication — Spring Security is now
// on the classpath (feat/jwt-auth) and @WebMvcTest doesn't pick up SecurityConfig's permitAll
// rules automatically. Exclude Security's autoconfiguration entirely (rather than
// @AutoConfigureMockMvc(addFilters = false), which would also disable CorrelationIdFilter and
// break the traceId assertion below) so this slice stays about error handling, not auth.
@WebMvcTest(
        controllers = TestExceptionController.class,
        excludeAutoConfiguration = {
            SecurityFilterAutoConfiguration.class,
            ServletWebSecurityAutoConfiguration.class
        })
class GlobalExceptionHandlerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void validationFailureReturnsRfc7807ProblemDetailWithTraceId() {
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result =
                mvc.post()
                        .uri("/test/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}")
                        .exchange();

        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(result).contentType().isCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.traceId").isNotNull();
        assertThat(result).bodyJson().extractingPath("$.fieldErrors.name").isNotNull();
    }

    @Test
    void unhandledExceptionReturnsGenericProblemDetail() {
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result = mvc.post().uri("/test/boom").exchange();

        assertThat(result).hasStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(result).contentType().isCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result)
                .bodyJson()
                .extractingPath("$.detail")
                .asString()
                .isEqualTo("An unexpected error occurred");
    }
}
