package com.certificategenerator.web.support;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exists only so {@link com.certificategenerator.web.GlobalExceptionHandlerTest} can exercise
 * {@link com.certificategenerator.web.GlobalExceptionHandler} without a real business endpoint,
 * which doesn't exist yet in this skeleton.
 */
@RestController
public class TestExceptionController {

    @PostMapping("/test/validate")
    public void validate(@Valid @RequestBody Payload payload) {}

    @PostMapping("/test/boom")
    public void boom() {
        throw new IllegalStateException("boom");
    }

    /** Under /api/**, so {@link com.certificategenerator.config.CorsConfigTest} can exercise CORS. */
    @PostMapping("/api/test/ping")
    public void ping() {}

    public record Payload(@NotBlank String name) {}
}
