package com.certificategenerator.certificate;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

final class CertificateSpecifications {

    private CertificateSpecifications() {}

    static Specification<Certificate> matching(String query, CertificateStatus status) {
        Specification<Certificate> spec = Specification.unrestricted();
        if (StringUtils.hasText(query)) {
            spec = spec.and(searchesFor(query));
        }
        if (status != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), status));
        }
        return spec;
    }

    private static Specification<Certificate> searchesFor(String query) {
        String pattern = "%" + query.toLowerCase() + "%";
        return (root, cq, cb) ->
                cb.or(
                        cb.like(cb.lower(root.get("recipientName")), pattern),
                        cb.like(cb.lower(root.get("courseName")), pattern),
                        cb.like(cb.lower(root.get("code")), pattern));
    }
}
