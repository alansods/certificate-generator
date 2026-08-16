package com.certificategenerator.certificate.batch;

import com.certificategenerator.certificate.CertificateService;
import com.certificategenerator.certificate.CertificateTemplate;
import com.certificategenerator.certificate.batch.dto.BatchImportResponse;
import com.certificategenerator.certificate.batch.dto.BatchRowError;
import com.certificategenerator.certificate.dto.CertificateRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

/**
 * Deliberately not {@code @Transactional} itself: each row is created via
 * {@link CertificateService#create}, which owns its own transaction, so one row's failure can
 * never roll back rows already committed. See design.md ("Per-row transaction isolation").
 */
@Service
public class BatchImportService {

    private static final List<String> EXPECTED_COLUMNS =
            List.of(
                    "recipient_name",
                    "recipient_email",
                    "course_name",
                    "workload_hours",
                    "completion_date",
                    "issue_date",
                    "instructor_name",
                    "template");

    private final CertificateService certificateService;
    private final BatchImportRepository batchImportRepository;
    private final Validator validator;
    private final ObjectMapper objectMapper;
    private final int maxRows;

    public BatchImportService(
            CertificateService certificateService,
            BatchImportRepository batchImportRepository,
            Validator validator,
            ObjectMapper objectMapper,
            @Value("${app.batch-import.max-rows}") int maxRows) {
        this.certificateService = certificateService;
        this.batchImportRepository = batchImportRepository;
        this.validator = validator;
        this.objectMapper = objectMapper;
        this.maxRows = maxRows;
    }

    public BatchImportResponse importCsv(MultipartFile file, Long userId) {
        List<CSVRecord> rows = parse(file);
        if (rows.size() > maxRows) {
            throw new BatchTooManyRowsException(rows.size(), maxRows);
        }

        List<BatchRowError> errors = new ArrayList<>();
        int successCount = 0;
        for (CSVRecord row : rows) {
            String reason = processRow(row, userId);
            if (reason == null) {
                successCount++;
            } else {
                // getRecordNumber() counts only data records (the header, though present in the
                // file, is skipped and not counted) — +1 so the reported line matches what a user
                // sees opening the CSV in a spreadsheet, where the header occupies line 1.
                errors.add(new BatchRowError((int) row.getRecordNumber() + 1, reason));
            }
        }

        persistAudit(file, userId, rows.size(), successCount, errors);
        return new BatchImportResponse(rows.size(), successCount, errors.size(), errors);
    }

    /** Returns {@code null} on success, or a human-readable reason the row was rejected. */
    private String processRow(CSVRecord row, Long userId) {
        CertificateRequest request;
        try {
            request =
                    new CertificateRequest(
                            row.get("recipient_name").trim(),
                            row.get("recipient_email").trim(),
                            row.get("course_name").trim(),
                            Integer.parseInt(row.get("workload_hours").trim()),
                            LocalDate.parse(row.get("completion_date").trim()),
                            LocalDate.parse(row.get("issue_date").trim()),
                            row.get("instructor_name").trim(),
                            CertificateTemplate.valueOf(row.get("template").trim().toUpperCase()),
                            null);
        } catch (Exception e) {
            return "Malformed row: " + e.getMessage();
        }

        Set<ConstraintViolation<CertificateRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            return violations.stream()
                    .map(v -> v.getPropertyPath() + " " + v.getMessage())
                    .collect(Collectors.joining("; "));
        }

        try {
            certificateService.create(request, userId);
            return null;
        } catch (Exception e) {
            return "Could not create certificate: " + e.getMessage();
        }
    }

    @Transactional
    void persistAudit(
            MultipartFile file, Long userId, int totalRows, int successCount, List<BatchRowError> errors) {
        String errorsJson = objectMapper.writeValueAsString(errors);
        batchImportRepository.save(
                new BatchImport(
                        userId,
                        file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown.csv",
                        totalRows,
                        successCount,
                        errors.size(),
                        errorsJson));
    }

    private static List<CSVRecord> parse(MultipartFile file) {
        try (var reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
                CSVParser parser =
                        CSVFormat.DEFAULT
                                .builder()
                                .setHeader(EXPECTED_COLUMNS.toArray(new String[0]))
                                .setSkipHeaderRecord(true)
                                .build()
                                .parse(reader)) {
            return parser.getRecords();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read uploaded CSV", e);
        }
    }
}
