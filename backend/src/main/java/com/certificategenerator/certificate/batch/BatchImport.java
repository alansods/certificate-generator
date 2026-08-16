package com.certificategenerator.certificate.batch;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "batch_imports")
public class BatchImport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String filename;

    @Column(name = "total_rows", nullable = false)
    private Integer totalRows;

    @Column(name = "success_count", nullable = false)
    private Integer successCount;

    @Column(name = "error_count", nullable = false)
    private Integer errorCount;

    @Column(name = "errors_json", nullable = false)
    private String errorsJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected BatchImport() {}

    public BatchImport(
            Long userId,
            String filename,
            Integer totalRows,
            Integer successCount,
            Integer errorCount,
            String errorsJson) {
        this.userId = userId;
        this.filename = filename;
        this.totalRows = totalRows;
        this.successCount = successCount;
        this.errorCount = errorCount;
        this.errorsJson = errorsJson;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getFilename() {
        return filename;
    }

    public Integer getTotalRows() {
        return totalRows;
    }

    public Integer getSuccessCount() {
        return successCount;
    }

    public Integer getErrorCount() {
        return errorCount;
    }

    public String getErrorsJson() {
        return errorsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
