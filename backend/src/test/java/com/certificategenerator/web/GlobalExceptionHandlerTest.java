package com.certificategenerator.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.web.support.TestExceptionController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@WebMvcTest(controllers = TestExceptionController.class)
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
