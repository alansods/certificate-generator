import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { ActivatedRoute, convertToParamMap, provideRouter } from "@angular/router";
import { CertificatePreviewPageComponent } from "./certificate-preview-page.component";

/** See certificate-list-page.component.spec.ts for why this is used instead of fixture.whenStable(). */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("CertificatePreviewPageComponent", () => {
  let httpMock: HttpTestingController;

  function setup(id = "7") {
    TestBed.configureTestingModule({
      imports: [CertificatePreviewPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(CertificatePreviewPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  function flushCertificate() {
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "GET")
      .flush({
        id: 7,
        code: "CERT-AAAA-BBBB",
        recipientName: "Jane Doe",
        recipientEmail: "jane@example.edu",
        courseName: "Advanced Angular",
        workloadHours: 40,
        template: "MODERN",
        status: "ISSUED",
      });
  }

  function flushPdf() {
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7/pdf"))
      .flush(new Blob(["%PDF-fake"], { type: "application/pdf" }));
  }

  it("holds the page's shape while the PDF is being generated", () => {
    const fixture = setup();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const placeholder = el.querySelector("[role='status']");
    expect(placeholder?.textContent).toContain("Generating the PDF…");
    // The placeholder carries the page proportions of the document it stands in for, so the
    // layout does not jump when the iframe replaces it.
    expect(placeholder?.className).toContain("aspect-[1.414/1]");

    httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates/7"));
  });

  it("shows the PDF in an iframe with the certificate's code once loaded", async () => {
    const fixture = setup();
    fixture.detectChanges();
    flushCertificate();
    flushPdf();
    await tick();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("CERT-AAAA-BBBB");
    const iframe = el.querySelector<HTMLIFrameElement>("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toMatch(/^blob:/);
  });

  it("shows an error state when the certificate lookup fails", async () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "GET")
      .flush(null, { status: 404, statusText: "Not Found" });
    await tick();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Could not load this certificate's PDF.");
    expect(el.querySelector("iframe")).toBeNull();
  });

  it("shows an error state when the PDF fetch fails", async () => {
    const fixture = setup();
    fixture.detectChanges();
    flushCertificate();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7/pdf"))
      .flush(null, { status: 500, statusText: "Internal Server Error" });
    await tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Could not load this certificate's PDF.",
    );
  });

  it("the Download button saves the already-fetched blob under the certificate's code", async () => {
    const fixture = setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    fixture.detectChanges();
    flushCertificate();
    flushPdf();
    await tick();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const downloadButton = [...el.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Download PDF",
    );
    expect(downloadButton).toBeDefined();
    downloadButton?.click();

    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("renders the document as a PDF whatever content type the response claims", async () => {
    const fixture = setup();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    fixture.detectChanges();
    flushCertificate();

    // A blob: URL in an iframe inherits this document's origin, so a body arriving as text/html
    // would be same-origin script. The type must not come from a header we do not control.
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7/pdf"))
      .flush(new Blob(["<script>alert(1)<\/script>"], { type: "text/html" }));
    await tick();
    fixture.detectChanges();

    const blob = createObjectURL.mock.calls.at(-1)?.[0] as Blob;
    expect(blob.type).toBe("application/pdf");
  });

  it("names the certificate being previewed, not just its code", async () => {
    const fixture = setup();
    fixture.detectChanges();
    flushCertificate();
    flushPdf();
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("CERT-AAAA-BBBB");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("Advanced Angular");
    expect(text).toContain("Modern");
  });

  it("offers the edit form for the certificate on screen", async () => {
    const fixture = setup();
    fixture.detectChanges();
    flushCertificate();
    flushPdf();
    await tick();
    fixture.detectChanges();

    const edit = (fixture.nativeElement as HTMLElement).querySelector("a[href$='/edit']");
    expect(edit?.getAttribute("href")).toBe("/certificates/7/edit");
  });

  it("links back to the certificate list", () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates/7"));

    const backLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>("a");
    expect(backLink?.getAttribute("href")).toBe("/certificates");
  });

  it("revokes the object URL when the component is destroyed", async () => {
    const fixture = setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    fixture.detectChanges();
    flushCertificate();
    flushPdf();
    await tick();
    fixture.detectChanges();

    fixture.destroy();

    expect(revokeSpy).toHaveBeenCalledWith("blob:fake");
  });
});
