package com.certificategenerator.certificate;

import com.certificategenerator.certificate.dto.CertificateRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CertificateService {

    /**
     * {@link CertificateCodeGenerator#generateUnique()} checks-then-uses (TOCTOU): two concurrent
     * creates can both pass its existsByCode check for the same candidate before either commits.
     * The `code` column's UNIQUE constraint is the actual safety net; this retries with a freshly
     * generated code on the rare constraint violation instead of surfacing a raw 500.
     */
    private static final int MAX_CREATE_ATTEMPTS = 3;

    private final CertificateRepository certificateRepository;
    private final CertificateCodeGenerator codeGenerator;

    public CertificateService(
            CertificateRepository certificateRepository, CertificateCodeGenerator codeGenerator) {
        this.certificateRepository = certificateRepository;
        this.codeGenerator = codeGenerator;
    }

    @Transactional
    public Certificate create(CertificateRequest request, Long createdBy) {
        for (int attempt = 1; ; attempt++) {
            Certificate certificate =
                    new Certificate(
                            codeGenerator.generateUnique(),
                            request.recipientName(),
                            request.recipientEmail(),
                            request.courseName(),
                            request.workloadHours(),
                            request.completionDate(),
                            request.issueDate(),
                            request.instructorName(),
                            request.template(),
                            request.status() != null ? request.status() : CertificateStatus.DRAFT,
                            createdBy);
            try {
                return certificateRepository.saveAndFlush(certificate);
            } catch (DataIntegrityViolationException e) {
                if (attempt >= MAX_CREATE_ATTEMPTS) {
                    throw e;
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public Page<Certificate> list(String query, CertificateStatus status, Pageable pageable) {
        return certificateRepository.findAll(
                CertificateSpecifications.matching(query, status), pageable);
    }

    @Transactional(readOnly = true)
    public Certificate get(Long id) {
        return certificateRepository.findById(id).orElseThrow(() -> new CertificateNotFoundException(id));
    }

    @Transactional
    public Certificate update(Long id, CertificateRequest request) {
        Certificate certificate = get(id);
        certificate.applyUpdate(
                request.recipientName(),
                request.recipientEmail(),
                request.courseName(),
                request.workloadHours(),
                request.completionDate(),
                request.issueDate(),
                request.instructorName(),
                request.template(),
                request.status() != null ? request.status() : certificate.getStatus());
        return certificate;
    }

    @Transactional
    public void delete(Long id) {
        if (!certificateRepository.existsById(id)) {
            throw new CertificateNotFoundException(id);
        }
        certificateRepository.deleteById(id);
    }
}
