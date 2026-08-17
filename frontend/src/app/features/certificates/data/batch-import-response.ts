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
