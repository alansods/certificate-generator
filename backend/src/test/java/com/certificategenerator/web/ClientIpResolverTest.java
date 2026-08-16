package com.certificategenerator.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver();

    @Mock private HttpServletRequest request;

    @Test
    void resolvesToRemoteAddr() {
        when(request.getRemoteAddr()).thenReturn("203.0.113.5");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.5");
    }

    @Test
    void ignoresXForwardedForHeader() {
        when(request.getRemoteAddr()).thenReturn("203.0.113.5");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.5");
        org.mockito.Mockito.verify(request, org.mockito.Mockito.never()).getHeader("X-Forwarded-For");
    }
}
