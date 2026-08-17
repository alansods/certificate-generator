import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { CertificatePageResponse } from "./certificate-page-response";
import { CertificatesApi } from "./certificates.api";

describe("CertificatesApi", () => {
  let httpMock: HttpTestingController;
  let api: CertificatesApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    api = TestBed.inject(CertificatesApi);
  });

  afterEach(() => httpMock.verify());

  it("list sends page/size/q/status query params and parses the {content, page} shape", () => {
    let result: CertificatePageResponse | undefined;
    api.list({ page: 1, size: 20, q: "jane", status: "ISSUED" }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates") && r.method === "GET",
    );
    expect(req.request.params.get("page")).toBe("1");
    expect(req.request.params.get("size")).toBe("20");
    expect(req.request.params.get("q")).toBe("jane");
    expect(req.request.params.get("status")).toBe("ISSUED");

    req.flush({
      content: [{ id: 1, code: "CERT-AAAA-BBBB" }],
      page: { size: 20, number: 1, totalElements: 21, totalPages: 2 },
    });

    expect(result?.content).toHaveLength(1);
    expect(result?.page.totalElements).toBe(21);
  });

  it("list omits q/status params when not provided", () => {
    api.list({ page: 0, size: 20, q: "", status: null }).subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates"));
    expect(req.request.params.has("q")).toBe(false);
    expect(req.request.params.has("status")).toBe(false);
    req.flush({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } });
  });

  it("deleteById sends a DELETE to the certificate's URL", () => {
    api.deleteById(7).subscribe();

    httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "DELETE").flush(null);
  });

  it("downloadPdf requests a blob from the certificate's PDF URL", () => {
    let result: Blob | undefined;
    api.downloadPdf(7).subscribe((blob) => (result = blob));

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates/7/pdf"));
    expect(req.request.responseType).toBe("blob");
    req.flush(new Blob(["%PDF"]));

    expect(result).toBeInstanceOf(Blob);
  });

  it("get sends a GET to the certificate's URL", () => {
    api.get(7).subscribe();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "GET")
      .flush({ id: 7, code: "CERT-AAAA-BBBB" });
  });

  it("create sends a POST with the request body", () => {
    const request = {
      recipientName: "Jane Doe",
      recipientEmail: "jane@example.com",
      courseName: "Advanced Angular",
      workloadHours: 40,
      completionDate: "2026-05-12",
      issueDate: "2026-05-15",
      instructorName: "John Smith",
      template: "CLASSIC" as const,
    };
    api.create(request).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates") && r.method === "POST",
    );
    expect(req.request.body).toEqual(request);
    req.flush({ id: 1, code: "CERT-AAAA-BBBB" });
  });

  it("update sends a PUT to the certificate's URL with the request body", () => {
    const request = {
      recipientName: "Jane Doe",
      recipientEmail: "jane@example.com",
      courseName: "Advanced Angular",
      workloadHours: 40,
      completionDate: "2026-05-12",
      issueDate: "2026-05-15",
      instructorName: "John Smith",
      template: "CLASSIC" as const,
    };
    api.update(7, request).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "PUT",
    );
    expect(req.request.body).toEqual(request);
    req.flush({ id: 7, code: "CERT-AAAA-BBBB" });
  });
});
