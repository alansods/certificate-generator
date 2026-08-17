import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { BatchUploadPageComponent } from "./batch-upload-page.component";

/** See certificate-list-page.component.spec.ts for why this is used instead of fixture.whenStable(). */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function selectFile(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change"));
}

describe("BatchUploadPageComponent", () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [BatchUploadPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(BatchUploadPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("disables the upload button until a file is selected, then shows the filename", () => {
    const fixture = setup();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const uploadButton = [...el.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Upload");
    expect(uploadButton?.disabled).toBe(true);

    const fileInput = el.querySelector<HTMLInputElement>("input[type='file']");
    if (!fileInput) {
      throw new Error("Expected to find the file input");
    }
    const label = el.querySelector<HTMLLabelElement>(`label[for='${fileInput.id}']`);
    expect(label).not.toBeNull();

    selectFile(fileInput, new File(["a,b\n"], "certificates.csv", { type: "text/csv" }));
    fixture.detectChanges();

    expect(uploadButton?.disabled).toBe(false);
    expect(el.textContent).toContain("certificates.csv");
  });

  it("shows the summary with no error table when every row succeeds", async () => {
    const fixture = setup();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const fileInput = el.querySelector<HTMLInputElement>("input[type='file']");
    if (!fileInput) {
      throw new Error("Expected to find the file input");
    }
    selectFile(fileInput, new File(["a,b\n"], "certificates.csv", { type: "text/csv" }));
    fixture.detectChanges();

    [...el.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Upload")?.click();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/batch") && r.method === "POST")
      .flush({ totalRows: 3, successCount: 3, errorCount: 0, errors: [] });
    await tick();
    fixture.detectChanges();

    const text = el.textContent ?? "";
    expect(text).toContain("3 rows processed, 3 succeeded, 0 failed.");
    expect(el.querySelector("table")).toBeNull();
  });

  it("shows the summary and a per-row error table, sorted by line, for a mixed result", async () => {
    const fixture = setup();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const fileInput = el.querySelector<HTMLInputElement>("input[type='file']");
    if (!fileInput) {
      throw new Error("Expected to find the file input");
    }
    selectFile(fileInput, new File(["a,b\n"], "certificates.csv", { type: "text/csv" }));
    fixture.detectChanges();

    [...el.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Upload")?.click();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/batch") && r.method === "POST")
      .flush({
        totalRows: 3,
        successCount: 1,
        errorCount: 2,
        errors: [
          { line: 4, reason: "missing recipientEmail" },
          { line: 2, reason: "invalid workloadHours" },
        ],
      });
    await tick();
    fixture.detectChanges();

    const text = el.textContent ?? "";
    expect(text).toContain("3 rows processed, 1 succeeded, 2 failed.");

    const rows = el.querySelectorAll("table tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("2");
    expect(rows[0].textContent).toContain("invalid workloadHours");
    expect(rows[1].textContent).toContain("4");
    expect(rows[1].textContent).toContain("missing recipientEmail");
  });

  it("shows a single error message with no summary when the upload itself is rejected", async () => {
    const fixture = setup();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const fileInput = el.querySelector<HTMLInputElement>("input[type='file']");
    if (!fileInput) {
      throw new Error("Expected to find the file input");
    }
    selectFile(fileInput, new File(["a,b\n"], "certificates.csv", { type: "text/csv" }));
    fixture.detectChanges();

    [...el.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Upload")?.click();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/batch") && r.method === "POST")
      .flush(
        { status: 400, detail: "File exceeds the maximum allowed size." },
        { status: 400, statusText: "Bad Request" },
      );
    await tick();
    fixture.detectChanges();

    const text = el.textContent ?? "";
    expect(text).toContain("File exceeds the maximum allowed size.");
    expect(text).not.toContain("rows processed");
    expect(el.querySelector("table")).toBeNull();
  });

  it("returns to the picker state when starting a new upload after a result", async () => {
    const fixture = setup();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const fileInput = el.querySelector<HTMLInputElement>("input[type='file']");
    if (!fileInput) {
      throw new Error("Expected to find the file input");
    }
    selectFile(fileInput, new File(["a,b\n"], "certificates.csv", { type: "text/csv" }));
    fixture.detectChanges();
    [...el.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Upload")?.click();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/batch") && r.method === "POST")
      .flush({ totalRows: 1, successCount: 1, errorCount: 0, errors: [] });
    await tick();
    fixture.detectChanges();

    [...el.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Upload another file")?.click();
    fixture.detectChanges();

    expect(el.querySelector("input[type='file']")).not.toBeNull();
    expect((el.textContent ?? "")).not.toContain("rows processed");
  });

  it("downloading the sample CSV requests the template endpoint", () => {
    const fixture = setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    [...el.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Download sample CSV")?.click();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/batch/template.csv"))
      .flush(new Blob(["recipient_name,recipient_email\n"]));
  });
});
