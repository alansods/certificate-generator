package com.certificategenerator.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminBootstrapRunnerTest {

    @Test
    void seedsTheAdminWithANormalizedEmailFromAMixedCaseAndPaddedBootstrapValue() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        when(userRepository.count()).thenReturn(0L);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");

        AdminBootstrapRunner runner =
                new AdminBootstrapRunner(
                        userRepository, passwordEncoder, "  Admin@Example.COM  ", "changeme123");

        runner.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("admin@example.com");
        assertThat(captor.getValue().getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    void doesNothingWhenAUserAlreadyExists() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        when(userRepository.count()).thenReturn(1L);

        AdminBootstrapRunner runner =
                new AdminBootstrapRunner(userRepository, passwordEncoder, "admin@example.com", "changeme123");

        runner.run();

        verify(userRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void doesNothingWhenTheBootstrapCredentialsAreBlank() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        when(userRepository.count()).thenReturn(0L);

        AdminBootstrapRunner runner = new AdminBootstrapRunner(userRepository, passwordEncoder, "", "");

        runner.run();

        verify(userRepository, org.mockito.Mockito.never()).save(any());
    }
}
