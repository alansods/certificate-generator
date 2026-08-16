package com.certificategenerator.certificate;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

/**
 * Generates {@code CERT-XXXX-XXXX} codes from a 32-symbol alphabet (uppercase letters and digits,
 * excluding 0/O and 1/I to avoid transcription ambiguity on a printed certificate) — per
 * openspec/specs/certificates/spec.md's "Unique certificate code" requirement, unguessable since
 * it's looked up through an unauthenticated public endpoint.
 */
@Component
public class CertificateCodeGenerator {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int BLOCK_LENGTH = 4;
    private static final int MAX_ATTEMPTS = 5;

    private final SecureRandom random = new SecureRandom();
    private final CertificateRepository certificateRepository;

    public CertificateCodeGenerator(CertificateRepository certificateRepository) {
        this.certificateRepository = certificateRepository;
    }

    public String generateUnique() {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String candidate = generate();
            if (!certificateRepository.existsByCode(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException(
                "Could not generate a unique certificate code after " + MAX_ATTEMPTS + " attempts");
    }

    private String generate() {
        return "CERT-" + block() + "-" + block();
    }

    private String block() {
        StringBuilder block = new StringBuilder(BLOCK_LENGTH);
        for (int i = 0; i < BLOCK_LENGTH; i++) {
            block.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return block.toString();
    }
}
