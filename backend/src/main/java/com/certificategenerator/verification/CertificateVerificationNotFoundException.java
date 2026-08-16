package com.certificategenerator.verification;

public class CertificateVerificationNotFoundException extends RuntimeException {

    public CertificateVerificationNotFoundException(String code) {
        super("Certificate not found: " + code);
    }
}
