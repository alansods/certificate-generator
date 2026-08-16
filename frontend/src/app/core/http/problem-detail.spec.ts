import { HttpErrorResponse } from "@angular/common/http";
import { isProblemDetail, ProblemDetail, toProblemDetail } from "./problem-detail";

describe("isProblemDetail", () => {
  it("accepts an object with a numeric status", () => {
    expect(isProblemDetail({ status: 404 })).toBe(true);
  });

  it("rejects null, non-objects and objects without a numeric status", () => {
    expect(isProblemDetail(null)).toBe(false);
    expect(isProblemDetail("error")).toBe(false);
    expect(isProblemDetail({ status: "404" })).toBe(false);
    expect(isProblemDetail({})).toBe(false);
  });
});

describe("toProblemDetail", () => {
  it("unwraps a problem+json body from an HttpErrorResponse", () => {
    const body: ProblemDetail = { status: 404, title: "Not found", detail: "Certificate not found", traceId: "abc-123" };
    const error = new HttpErrorResponse({ status: 404, error: body });

    expect(toProblemDetail(error)).toEqual(body);
  });

  it("returns a plain ProblemDetail-shaped value unchanged", () => {
    const body: ProblemDetail = { status: 429, title: "Too many requests" };

    expect(toProblemDetail(body)).toEqual(body);
  });

  it("falls back to a generic network error for a non-conforming error", () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent("error") });

    expect(toProblemDetail(error)).toEqual({
      status: 0,
      title: "Network error",
      detail: "Could not reach the server.",
    });
  });
});
