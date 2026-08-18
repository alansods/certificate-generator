/**
 * The shape the backend generates (`certificate/CertificateCodeGenerator.java`). Checked before a
 * request so a typo produces "that is not a code" instead of a round trip that comes back as
 * "no certificate found" — two different problems that should not read the same.
 */
export const CERTIFICATE_CODE_PATTERN = /^CERT-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** Length of a complete code, for the field's `maxlength`. */
export const CERTIFICATE_CODE_LENGTH = 14;
