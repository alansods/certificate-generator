package com.certificategenerator.certificate;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CertificateRepository
        extends JpaRepository<Certificate, Long>, JpaSpecificationExecutor<Certificate> {

    boolean existsByCode(String code);

    Optional<Certificate> findByCode(String code);
}
