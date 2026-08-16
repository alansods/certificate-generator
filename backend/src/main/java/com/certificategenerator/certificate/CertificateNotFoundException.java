package com.certificategenerator.certificate;

public class CertificateNotFoundException extends RuntimeException {

    public CertificateNotFoundException(Long id) {
        super("Certificate not found: " + id);
    }
}
