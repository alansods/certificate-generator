import { CertificateStatus, CertificateTemplate } from "./certificate-page-response";

/** Matches backend/.../certificate/dto/CertificateRequest.java (docs/api-reference.md). `status` is optional — omitted on create, defaults server-side to DRAFT. */
export interface CertificateRequest {
  recipientName: string;
  recipientEmail: string;
  courseName: string;
  workloadHours: number;
  completionDate: string;
  issueDate: string;
  instructorName: string;
  template: CertificateTemplate;
  status?: CertificateStatus;
}
