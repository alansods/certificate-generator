package com.certificategenerator.certificate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "certificates")
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "course_name", nullable = false)
    private String courseName;

    @Column(name = "workload_hours", nullable = false)
    private Integer workloadHours;

    @Column(name = "completion_date", nullable = false)
    private LocalDate completionDate;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "instructor_name", nullable = false)
    private String instructorName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CertificateTemplate template;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CertificateStatus status;

    /** Server-set at creation from the authenticated principal, never client-writable. */
    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Certificate() {}

    public Certificate(
            String code,
            String recipientName,
            String recipientEmail,
            String courseName,
            Integer workloadHours,
            LocalDate completionDate,
            LocalDate issueDate,
            String instructorName,
            CertificateTemplate template,
            CertificateStatus status,
            Long createdBy) {
        this.code = code;
        this.recipientName = recipientName;
        this.recipientEmail = recipientEmail;
        this.courseName = courseName;
        this.workloadHours = workloadHours;
        this.completionDate = completionDate;
        this.issueDate = issueDate;
        this.instructorName = instructorName;
        this.template = template;
        this.status = status;
        this.createdBy = createdBy;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void applyUpdate(
            String recipientName,
            String recipientEmail,
            String courseName,
            Integer workloadHours,
            LocalDate completionDate,
            LocalDate issueDate,
            String instructorName,
            CertificateTemplate template,
            CertificateStatus status) {
        this.recipientName = recipientName;
        this.recipientEmail = recipientEmail;
        this.courseName = courseName;
        this.workloadHours = workloadHours;
        this.completionDate = completionDate;
        this.issueDate = issueDate;
        this.instructorName = instructorName;
        this.template = template;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public String getCourseName() {
        return courseName;
    }

    public Integer getWorkloadHours() {
        return workloadHours;
    }

    public LocalDate getCompletionDate() {
        return completionDate;
    }

    public LocalDate getIssueDate() {
        return issueDate;
    }

    public String getInstructorName() {
        return instructorName;
    }

    public CertificateTemplate getTemplate() {
        return template;
    }

    public CertificateStatus getStatus() {
        return status;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
