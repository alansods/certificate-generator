package com.certificategenerator.certificate;

import com.certificategenerator.certificate.dto.CertificateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CertificateService {

    private final CertificateRepository certificateRepository;
    private final CertificateCodeGenerator codeGenerator;

    public CertificateService(
            CertificateRepository certificateRepository, CertificateCodeGenerator codeGenerator) {
        this.certificateRepository = certificateRepository;
        this.codeGenerator = codeGenerator;
    }

    @Transactional
    public Certificate create(CertificateRequest request, Long createdBy) {
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
        return certificateRepository.save(certificate);
    }

    public Page<Certificate> list(String query, CertificateStatus status, Pageable pageable) {
        return certificateRepository.findAll(
                CertificateSpecifications.matching(query, status), pageable);
    }

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
