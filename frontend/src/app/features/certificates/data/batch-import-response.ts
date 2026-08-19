/** Matches backend/.../certificate/batch/dto/{BatchImportResponse,BatchRowError}.java (docs/api-reference.md). */
export interface BatchRowError {
  line: number;
  reason: string;
}

export interface BatchImportResponse {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: BatchRowError[];
}

/**
 * What `CertificatesApi.uploadBatch` emits. The upload is reported as it goes rather than as one
 * opaque wait: a CSV of a few hundred rows on a slow connection is long enough that a bar the
 * user can watch is the difference between "working" and "stuck".
 */
export type BatchUploadEvent =
  | { kind: "progress"; percent: number | null }
  | { kind: "done"; response: BatchImportResponse };
