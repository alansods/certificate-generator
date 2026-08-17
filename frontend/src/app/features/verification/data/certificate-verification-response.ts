/** Mirrors certificates/data/certificate-page-response.ts's CertificateStatus, kept separate on purpose — see design.md ("no reason to import from or be imported by the certificates feature"). */
export type CertificateVerificationStatus = "DRAFT" | "ISSUED" | "REVOKED";

/** Matches backend/.../verification/dto/CertificateVerificationResponse.java (docs/api-reference.md). Never includes recipientEmail or an internal id. */
export interface CertificateVerificationResponse {
  recipientName: string;
  courseName: string;
  workloadHours: number;
  issueDate: string;
  status: CertificateVerificationStatus;
}
