package com.certificategenerator.certificate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.certificategenerator.certificate.dto.CertificateRequest;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class CertificateServiceTest {

    private CertificateRepository repository;
    private CertificateCodeGenerator codeGenerator;
    private CertificateService service;

    @BeforeEach
    void setUp() {
        repository = mock(CertificateRepository.class);
        codeGenerator = mock(CertificateCodeGenerator.class);
        when(codeGenerator.generateUnique()).thenReturn("CERT-AAAA-BBBB");
        service = new CertificateService(repository, codeGenerator);
    }

    @Test
    void createDefaultsToDraftWhenStatusIsOmitted() {
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Certificate created = service.create(sampleRequest(null), 7L);

        assertThat(created.getStatus()).isEqualTo(CertificateStatus.DRAFT);
        assertThat(created.getCreatedBy()).isEqualTo(7L);
        assertThat(created.getCode()).isEqualTo("CERT-AAAA-BBBB");
    }

    @Test
    void createUsesTheRequestedStatusWhenProvided() {
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Certificate created = service.create(sampleRequest(CertificateStatus.ISSUED), 7L);

        assertThat(created.getStatus()).isEqualTo(CertificateStatus.ISSUED);
    }

    @Test
    void createRetriesOnCodeCollisionAndEventuallySucceeds() {
        when(repository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("duplicate code"))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Certificate created = service.create(sampleRequest(null), 7L);

        assertThat(created).isNotNull();
        verify(codeGenerator, times(2)).generateUnique();
        verify(repository, times(2)).saveAndFlush(any());
    }

    @Test
    void createGivesUpAfterMaxAttemptsAndRethrows() {
        when(repository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("duplicate code"));

        assertThatThrownBy(() -> service.create(sampleRequest(null), 7L))
                .isInstanceOf(DataIntegrityViolationException.class);
        verify(repository, times(3)).saveAndFlush(any());
    }

    @Test
    void getThrowsNotFoundForAnUnknownId() {
        when(repository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(1L)).isInstanceOf(CertificateNotFoundException.class);
    }

    @Test
    void updateThrowsNotFoundForAnUnknownId() {
        when(repository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(1L, sampleRequest(null)))
                .isInstanceOf(CertificateNotFoundException.class);
    }

    @Test
    void updateAppliesEveryFieldFromTheRequest() {
        Certificate existing =
                new Certificate(
                        "CERT-OLD1-OLD2",
                        "Old Name",
                        "old@example.com",
                        "Old Course",
                        10,
                        LocalDate.of(2025, 1, 1),
                        LocalDate.of(2025, 1, 2),
                        "Old Instructor",
                        CertificateTemplate.CLASSIC,
                        CertificateStatus.DRAFT,
                        7L);
        when(repository.findById(1L)).thenReturn(Optional.of(existing));

        Certificate updated = service.update(1L, sampleRequest(CertificateStatus.ISSUED));

        assertThat(updated.getRecipientName()).isEqualTo("Jane Doe");
        assertThat(updated.getStatus()).isEqualTo(CertificateStatus.ISSUED);
        assertThat(updated.getCode()).isEqualTo("CERT-OLD1-OLD2"); // never overwritten by update
        assertThat(updated.getCreatedBy()).isEqualTo(7L); // never overwritten by update
    }

    @Test
    void deleteThrowsNotFoundForAnUnknownIdAndNeverCallsDeleteById() {
        when(repository.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(CertificateNotFoundException.class);
        verify(repository, never()).deleteById(any());
    }

    @Test
    void deleteRemovesAnExistingCertificate() {
        when(repository.existsById(1L)).thenReturn(true);

        service.delete(1L);

        verify(repository).deleteById(1L);
    }

    private static CertificateRequest sampleRequest(CertificateStatus status) {
        return new CertificateRequest(
                "Jane Doe",
                "jane@example.com",
                "Advanced Angular",
                40,
                LocalDate.of(2026, 5, 12),
                LocalDate.of(2026, 5, 15),
                "John Smith",
                CertificateTemplate.CLASSIC,
                status);
    }
}
