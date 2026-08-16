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
  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    isProblemDetail((error as { error: unknown }).error)
  ) {
    return (error as { error: ProblemDetail }).error;
  }
  if (isProblemDetail(error)) {
    return error;
  }
  return { status: 0, title: "Network error", detail: "Could not reach the server." };
}
