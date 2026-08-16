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

    private static final char LIKE_ESCAPE = '\\';

    private static Specification<Certificate> searchesFor(String query) {
        String pattern = "%" + escapeLikeWildcards(query.toLowerCase()) + "%";
        return (root, cq, cb) ->
                cb.or(
                        cb.like(cb.lower(root.get("recipientName")), pattern, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("courseName")), pattern, LIKE_ESCAPE),
                        cb.like(cb.lower(root.get("code")), pattern, LIKE_ESCAPE));
    }

    /**
     * Escapes {@code %}/{@code _}/the escape character itself so a search for e.g. {@code "100%"}
     * matches that literal string instead of being interpreted as a LIKE wildcard.
     */
    private static String escapeLikeWildcards(String value) {
        return value
                .replace(String.valueOf(LIKE_ESCAPE), LIKE_ESCAPE + "" + LIKE_ESCAPE)
                .replace("%", LIKE_ESCAPE + "%")
                .replace("_", LIKE_ESCAPE + "_");
    }
}
