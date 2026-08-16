package com.certificategenerator.certificate.batch;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.certificategenerator.certificate.Certificate;
import com.certificategenerator.certificate.CertificateService;
import com.certificategenerator.certificate.CertificateStatus;
import com.certificategenerator.certificate.CertificateTemplate;
import com.certificategenerator.certificate.batch.dto.BatchImportResponse;
import com.certificategenerator.certificate.dto.CertificateRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.ObjectMapper;

class BatchImportServiceTest {

    private static final String HEADER =
            "recipient_name,recipient_email,course_name,workload_hours,completion_date,issue_date,instructor_name,template";

    private CertificateService certificateService;
    private BatchImportRepository batchImportRepository;
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private BatchImportService service;

    @BeforeEach
    void setUp() {
        certificateService = mock(CertificateService.class);
        batchImportRepository = mock(BatchImportRepository.class);
        service =
                new BatchImportService(
                        certificateService, batchImportRepository, validator, objectMapper, 500);
    }

    @Test
    void allValidRowsAreCreatedWithNoErrors() {
        when(certificateService.create(any(), eq(7L))).thenReturn(sampleCertificate());
        String csv =
                HEADER
                        + "\n"
                        + validRow("Jane Doe", "jane@example.com")
                        + "\n"
                        + validRow("John Roe", "john@example.com");

        BatchImportResponse response = service.importCsv(multipartFile(csv), 7L);

        assertThat(response.totalRows()).isEqualTo(2);
        assertThat(response.successCount()).isEqualTo(2);
        assertThat(response.errorCount()).isZero();
        assertThat(response.errors()).isEmpty();
        verify(certificateService, times(2)).create(any(), eq(7L));
    }

    @Test
    void mixedValidAndInvalidRowsReportLineNumbersAndContinue() {
        when(certificateService.create(any(), eq(7L))).thenReturn(sampleCertificate());
        String csv =
                HEADER
                        + "\n"
                        + validRow("Jane Doe", "jane@example.com")
                        + "\n"
                        + ",jane@example.com,Course,40,2026-05-12,2026-05-15,John,CLASSIC"
                        + "\n"
                        + validRow("John Roe", "john@example.com");

        BatchImportResponse response = service.importCsv(multipartFile(csv), 7L);

        assertThat(response.totalRows()).isEqualTo(3);
        assertThat(response.successCount()).isEqualTo(2);
        assertThat(response.errorCount()).isEqualTo(1);
        assertThat(response.errors()).hasSize(1);
        assertThat(response.errors().get(0).line()).isEqualTo(3);
        verify(certificateService, times(2)).create(any(), eq(7L));
    }

    @Test
    void allInvalidRowsCreateNothing() {
        String csv =
                HEADER
                        + "\n"
                        + ",jane@example.com,Course,40,2026-05-12,2026-05-15,John,CLASSIC"
                        + "\n"
                        + "Jane Doe,not-an-email,Course,40,2026-05-12,2026-05-15,John,CLASSIC";

        BatchImportResponse response = service.importCsv(multipartFile(csv), 7L);

        assertThat(response.successCount()).isZero();
        assertThat(response.errorCount()).isEqualTo(2);
        verify(certificateService, never()).create(any(), any());
    }

    @Test
    void malformedFieldValueIsReportedAsRowErrorNotAnException() {
        String csv =
                HEADER + "\n" + "Jane Doe,jane@example.com,Course,not-a-number,2026-05-12,2026-05-15,John,CLASSIC";

        BatchImportResponse response = service.importCsv(multipartFile(csv), 7L);

        assertThat(response.errorCount()).isEqualTo(1);
        assertThat(response.errors().get(0).reason()).contains("Malformed row");
    }

    @Test
    void exceedingMaxRowsRejectsBeforeCreatingAnything() {
        BatchImportService limited =
                new BatchImportService(certificateService, batchImportRepository, validator, objectMapper, 1);
        String csv =
                HEADER
                        + "\n"
                        + validRow("Jane Doe", "jane@example.com")
                        + "\n"
                        + validRow("John Roe", "john@example.com");

        assertThatThrownBy(() -> limited.importCsv(multipartFile(csv), 7L))
                .isInstanceOf(BatchTooManyRowsException.class);
        verify(certificateService, never()).create(any(), any());
    }

    @Test
    void auditRecordIsPersistedWithMatchingCountsAndErrorsJson() {
        when(certificateService.create(any(), eq(7L))).thenReturn(sampleCertificate());
        String csv =
                HEADER
                        + "\n"
                        + validRow("Jane Doe", "jane@example.com")
                        + "\n"
                        + ",jane@example.com,Course,40,2026-05-12,2026-05-15,John,CLASSIC";

        service.importCsv(multipartFile(csv), 7L);

        ArgumentCaptor<BatchImport> captor = ArgumentCaptor.forClass(BatchImport.class);
        verify(batchImportRepository).save(captor.capture());
        BatchImport saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(7L);
        assertThat(saved.getTotalRows()).isEqualTo(2);
        assertThat(saved.getSuccessCount()).isEqualTo(1);
        assertThat(saved.getErrorCount()).isEqualTo(1);
        assertThat(saved.getErrorsJson()).contains("\"line\"");
    }

    private static String validRow(String recipientName, String recipientEmail) {
        return recipientName
                + ","
                + recipientEmail
                + ",Advanced Angular,40,2026-05-12,2026-05-15,John Smith,CLASSIC";
    }

    private static MockMultipartFile multipartFile(String csv) {
        return new MockMultipartFile(
                "file", "batch.csv", "text/csv", csv.getBytes(java.nio.charset.StandardCharsets.UTF_8));
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
}
