import { HttpErrorResponse } from "@angular/common/http";

/** RFC 7807 error shape returned by every backend endpoint (docs/api-reference.md). */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  fieldErrors?: Record<string, string>;
  [key: string]: unknown;
}

export function isProblemDetail(value: unknown): value is ProblemDetail {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as { status: unknown }).status === "number"
  );
}

/**
 * Normalizes any caught HTTP error into a `ProblemDetail`, so every feature built on the HTTP
 * layer consumes one consistent error shape instead of each parsing `HttpErrorResponse` itself.
 * Not an interceptor: it has to run after auth-refresh.interceptor's retry has already happened
 * (or failed), and interceptor response-ordering runs closest-to-backend-first, so a generic
 * outer interceptor would see a 401 before the refresh retry gets a chance to resolve it. A plain
 * function called from `catchError` at the point of use avoids that ordering trap entirely.
 */
export function toProblemDetail(error: unknown): ProblemDetail {
  // Checked first and separately from the generic isProblemDetail(error) fallback below:
  // HttpErrorResponse itself carries a numeric `status`, so it would otherwise duck-type as a
  // ProblemDetail and get returned as-is instead of unwrapping (or falling back from) its body.
  if (error instanceof HttpErrorResponse) {
    if (isProblemDetail(error.error)) {
      return error.error;
    }
    return { status: error.status, title: "Network error", detail: "Could not reach the server." };
  }
  if (isProblemDetail(error)) {
    return error;
  }
  return { status: 0, title: "Network error", detail: "Could not reach the server." };
}
