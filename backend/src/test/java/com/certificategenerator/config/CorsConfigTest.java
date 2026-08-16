package com.certificategenerator.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.certificategenerator.web.support.TestExceptionController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@WebMvcTest(controllers = TestExceptionController.class)
@Import(CorsConfig.class)
@TestPropertySource(properties = "app.cors.allowed-origins=http://localhost:4200")
class CorsConfigTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void configuredOriginIsAllowed() {
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result =
                mvc.options()
                        .uri("/api/test/ping")
                        .header(HttpHeaders.ORIGIN, "http://localhost:4200")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .exchange();

        assertThat(result)
                .headers()
                .hasSingleValue(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200");
    }

    @Test
    void unconfiguredOriginIsRejected() {
        MockMvcTester mvc = MockMvcTester.create(mockMvc);

        MvcTestResult result =
                mvc.options()
                        .uri("/api/test/ping")
                        .header(HttpHeaders.ORIGIN, "https://evil.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .exchange();

        assertThat(result).headers().doesNotContainHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN);
    }
}
