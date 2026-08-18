/**
 * The shape a certificate code has: `CERT-` and two four-character alphanumeric groups. Checked
 * before a request so a typo produces "that is not a code" instead of a round trip that comes
 * back as "no certificate found" — two different problems that should not read the same.
 *
 * Deliberately broader than `certificate/CertificateCodeGenerator.java`'s alphabet, which drops
 * the ambiguous 0/O and 1/I: this is a shape check, not a checksum, and rejecting a code the
 * backend might legitimately start issuing later would be the worse failure.
 */
export const CERTIFICATE_CODE_PATTERN = /^CERT-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** Length of a complete code, for the field's `maxlength`. */
export const CERTIFICATE_CODE_LENGTH = 14;
