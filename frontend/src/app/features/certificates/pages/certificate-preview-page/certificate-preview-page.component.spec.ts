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
      .flush({ id: 7, code: "CERT-AAAA-BBBB", recipientName: "Jane Doe" });
  }

  function flushPdf() {
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7/pdf"))
      .flush(new Blob(["%PDF-fake"], { type: "application/pdf" }));
  }

  it("shows a spinner while loading", () => {
    const fixture = setup();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector("mat-spinner")).not.toBeNull();
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
      (b) => b.textContent?.trim() === "Download",
    );
    expect(downloadButton).not.toBeNull();
    downloadButton?.click();

    expect(URL.createObjectURL).toHaveBeenCalled();
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
