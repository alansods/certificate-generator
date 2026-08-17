export type CertificateTemplate = "CLASSIC" | "MODERN" | "MINIMAL";
export type CertificateStatus = "DRAFT" | "ISSUED" | "REVOKED";

/** Matches backend/.../certificate/dto/CertificateResponse.java (docs/api-reference.md). */
export interface CertificateResponse {
  id: number;
  code: string;
  recipientName: string;
  recipientEmail: string;
  courseName: string;
  workloadHours: number;
  completionDate: string;
  issueDate: string;
  instructorName: string;
  template: CertificateTemplate;
  status: CertificateStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

/**
 * Exact shape of Spring Data's PagedModel with pageSerializationMode: VIA_DTO — confirmed against
 * the spring-data-commons jar (PagedModel.getMetadata() carries @JsonProperty("page")), not the
 * flat {content, totalElements, ...} shape some Spring versions/configs use. See design.md.
 */
export interface CertificatePageResponse {
  content: CertificateResponse[];
  page: PageMetadata;
}
