package com.certificategenerator.certificate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

class CertificateCodeGeneratorTest {

    @Test
    void generatesTheExpectedFormatAndAlphabet() {
        CertificateRepository repository = mock(CertificateRepository.class);
        when(repository.existsByCode(org.mockito.ArgumentMatchers.any())).thenReturn(false);
        CertificateCodeGenerator generator = new CertificateCodeGenerator(repository);

        String code = generator.generateUnique();

        assertThat(code).matches("CERT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}");
    }

    @Test
    void retriesOnCollisionAndEventuallyReturnsAUniqueCode() {
        CertificateRepository repository = mock(CertificateRepository.class);
        when(repository.existsByCode(org.mockito.ArgumentMatchers.any()))
                .thenReturn(true, true, false);
        CertificateCodeGenerator generator = new CertificateCodeGenerator(repository);

        String code = generator.generateUnique();

        assertThat(code).startsWith("CERT-");
    }

    @Test
    void givesUpAfterFiveFailedAttempts() {
        CertificateRepository repository = mock(CertificateRepository.class);
        when(repository.existsByCode(org.mockito.ArgumentMatchers.any())).thenReturn(true);
        CertificateCodeGenerator generator = new CertificateCodeGenerator(repository);

        assertThatThrownBy(generator::generateUnique).isInstanceOf(IllegalStateException.class);
    }
}
