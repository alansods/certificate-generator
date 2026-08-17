import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { Subject } from "rxjs";
import { PdfPreviewDialogComponent } from "./pdf-preview-dialog.component";

/** See certificate-list-page.component.spec.ts for why this is used instead of fixture.whenStable(). */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("PdfPreviewDialogComponent", () => {
  let httpMock: HttpTestingController;
  let closedSubject: Subject<unknown>;

  function setup() {
    closedSubject = new Subject();
    TestBed.configureTestingModule({
      imports: [PdfPreviewDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { id: 7, code: "CERT-AAAA-BBBB" } },
        { provide: MatDialogRef, useValue: { afterClosed: () => closedSubject.asObservable() } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(PdfPreviewDialogComponent);
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  function flushPdf() {
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7/pdf"))
      .flush(new Blob(["%PDF-fake"], { type: "application/pdf" }));
  }

  it("shows a spinner while the PDF is loading", () => {
    const fixture = setup();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector("mat-spinner")).not.toBeNull();
    httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates/7/pdf"));
  });

  it("shows the PDF in an iframe once loaded", async () => {
    const fixture = setup();
    fixture.detectChanges();
    flushPdf();
    await tick();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector("mat-spinner")).toBeNull();
    const iframe = el.querySelector<HTMLIFrameElement>("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toMatch(/^blob:/);
  });

  it("shows an error state with a close action when the fetch fails", async () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7/pdf"))
      .flush(null, { status: 500, statusText: "Internal Server Error" });
    await tick();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Could not load this certificate's PDF.");
    expect(el.querySelector("iframe")).toBeNull();
    expect([...el.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Close")).toBe(
      true,
    );
  });

  it("the Download button in the dialog saves the already-fetched blob", async () => {
    const fixture = setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    fixture.detectChanges();
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

  it("revokes the preview's object URL when the dialog closes", async () => {
    const fixture = setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    fixture.detectChanges();
    flushPdf();
    await tick();
    fixture.detectChanges();

    closedSubject.next(true);

    expect(revokeSpy).toHaveBeenCalledWith("blob:fake");
  });
});
