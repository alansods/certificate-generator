import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { CertificateVerificationResponse } from "./certificate-verification-response";
import { VerificationApi } from "./verification.api";

describe("VerificationApi", () => {
  let httpMock: HttpTestingController;
  let api: VerificationApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    api = TestBed.inject(VerificationApi);
  });

  afterEach(() => httpMock.verify());

  it("verify sends a GET to the public verify URL for the given code", () => {
    let result: CertificateVerificationResponse | undefined;
    api.verify("CERT-AAAA-BBBB").subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/public/verify/CERT-AAAA-BBBB") && r.method === "GET",
    );
    req.flush({
      recipientName: "Jane Doe",
      courseName: "Advanced Angular",
      workloadHours: 40,
      issueDate: "2026-05-15",
      status: "ISSUED",
    });

    expect(result?.recipientName).toBe("Jane Doe");
  });

  it("verify URL-encodes the code", () => {
    api.verify("weird/code with space").subscribe();

    httpMock
      .expectOne(
        (r) => r.url.endsWith("/api/v1/public/verify/weird%2Fcode%20with%20space") && r.method === "GET",
      )
      .flush({
        recipientName: "Jane Doe",
        courseName: "Advanced Angular",
        workloadHours: 40,
        issueDate: "2026-05-15",
        status: "ISSUED",
      });
  });
});
