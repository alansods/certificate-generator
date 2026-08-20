import { HttpEventType, provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
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
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(BatchUploadPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  function el(fixture: ComponentFixture<BatchUploadPageComponent>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function button(
    fixture: ComponentFixture<BatchUploadPageComponent>,
    label: string,
  ): HTMLButtonElement | undefined {
    return [...el(fixture).querySelectorAll("button")].find(
      (candidate) => candidate.textContent?.trim() === label,
    );
  }

  /** Picks a file and starts the upload, leaving the POST for the caller to answer. */
  function startUpload(fixture: ComponentFixture<BatchUploadPageComponent>): void {
    const fileInput = el(fixture).querySelector<HTMLInputElement>("input[type='file']");
    if (!fileInput) {
      throw new Error("Expected to find the file input");
    }
    selectFile(fileInput, new File(["a,b\n"], "certificates.csv", { type: "text/csv" }));
    fixture.detectChanges();
    button(fixture, "Upload")?.click();
  }

  function dropFile(fixture: ComponentFixture<BatchUploadPageComponent>, file: File): void {
    const dropArea = el(fixture).querySelector("label[for='batch-upload-file']");
    if (!dropArea) {
      throw new Error("Expected the drop area");
    }
    const drop = new Event("drop", { bubbles: true }) as DragEvent;
    Object.defineProperty(drop, "dataTransfer", { value: { files: [file] } });
    dropArea.dispatchEvent(drop);
    fixture.detectChanges();
  }

  function flushImport(body: object): void {
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/batch") && r.method === "POST")
      .flush(body);
  }

  /** The counters are a `<dl>`; read them as the pairs they are rather than as loose text. */
  function counters(fixture: ComponentFixture<BatchUploadPageComponent>): Record<string, string> {
    const entries: Record<string, string> = {};
    for (const group of el(fixture).querySelectorAll("dl > div")) {
      const term = group.querySelector("dt")?.textContent?.trim();
      const value = group.querySelector("dd")?.textContent?.trim();
      if (term && value) {
        entries[term] = value;
      }
    }
    return entries;
  }

  it("disables the upload button until a file is selected, then shows the filename", () => {
    const fixture = setup();
    fixture.detectChanges();

    expect(button(fixture, "Upload")?.disabled).toBe(true);

    const fileInput = el(fixture).querySelector<HTMLInputElement>("input[type='file']");
    if (!fileInput) {
      throw new Error("Expected to find the file input");
    }
    // The drop area is the input's label, so dropping and choosing are the same control.
    expect(el(fixture).querySelector(`label[for='${fileInput.id}']`)).not.toBeNull();

    selectFile(fileInput, new File(["a,b\n"], "certificates.csv", { type: "text/csv" }));
    fixture.detectChanges();

    expect(button(fixture, "Upload")?.disabled).toBe(false);
    expect(el(fixture).textContent).toContain("certificates.csv");
  });

  it("shows how much of the upload has been sent while it is in flight", () => {
    const fixture = setup();
    fixture.detectChanges();
    startUpload(fixture);

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates/batch") && r.method === "POST",
    );
    req.event({ type: HttpEventType.UploadProgress, loaded: 512, total: 2048 });
    fixture.detectChanges();

    const bar = el(fixture).querySelector("[role='progressbar']");
    expect(bar?.getAttribute("aria-valuenow")).toBe("25");
    expect(el(fixture).textContent).toContain("25% uploaded");

    req.flush({ totalRows: 1, successCount: 1, errorCount: 0, errors: [] });
  });

  it("shows a determinate bar at zero percent rather than falling back to indeterminate", () => {
    const fixture = setup();
    fixture.detectChanges();
    startUpload(fixture);

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates/batch") && r.method === "POST",
    );
    req.event({ type: HttpEventType.UploadProgress, loaded: 0, total: 2048 });
    fixture.detectChanges();

    const bar = el(fixture).querySelector("[role='progressbar']");
    expect(bar?.getAttribute("aria-valuenow")).toBe("0");
    expect(el(fixture).textContent).toContain("0% uploaded");
    expect(el(fixture).querySelector(".skeleton")).toBeNull();

    req.flush({ totalRows: 1, successCount: 1, errorCount: 0, errors: [] });
  });

  it("claims no progress value when the upload's total size is unknown", () => {
    const fixture = setup();
    fixture.detectChanges();
    startUpload(fixture);

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates/batch") && r.method === "POST",
    );
    req.event({ type: HttpEventType.UploadProgress, loaded: 512 });
    fixture.detectChanges();

    const bar = el(fixture).querySelector("[role='progressbar']");
    expect(bar).not.toBeNull();
    // Indeterminate: a bar that invented a percentage here would be lying to the user.
    expect(bar?.hasAttribute("aria-valuenow")).toBe(false);
    expect(el(fixture).textContent).toContain("Working…");

    req.flush({ totalRows: 1, successCount: 1, errorCount: 0, errors: [] });
  });

  it("reports a clean import as three counters, with no error list", async () => {
    const fixture = setup();
    fixture.detectChanges();
    startUpload(fixture);
    flushImport({ totalRows: 3, successCount: 3, errorCount: 0, errors: [] });
    await tick();
    fixture.detectChanges();

    expect(counters(fixture)).toEqual({ "Total rows": "3", Created: "3", Failed: "0" });
    expect(el(fixture).querySelector("table")).toBeNull();
    expect(el(fixture).textContent).toContain("Every row was imported.");
    expect(button(fixture, "Download error report")).toBeUndefined();
  });

  it("reports a partial import as counters plus the failed rows, sorted by line", async () => {
    const fixture = setup();
    fixture.detectChanges();
    startUpload(fixture);
    flushImport({
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

    expect(counters(fixture)).toEqual({ "Total rows": "3", Created: "1", Failed: "2" });

    expect(el(fixture).querySelector("table caption")?.textContent).toContain(
      "Rows that could not be imported",
    );
    const rows = [...el(fixture).querySelectorAll("tbody tr")];
    const cells = rows.map((row) =>
      [...row.querySelectorAll("td")].map((cell) => cell.textContent?.trim()),
    );
    expect(cells).toEqual([
      ["2", "invalid workloadHours"],
      ["4", "missing recipientEmail"],
    ]);
  });

  it("saves the failed rows as a CSV built from the response already on screen", async () => {
    const fixture = setup();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    fixture.detectChanges();
    startUpload(fixture);
    flushImport({
      totalRows: 2,
      successCount: 0,
      errorCount: 2,
      errors: [
        { line: 3, reason: 'reason with a comma, a "quote" and more' },
        { line: 2, reason: "invalid workloadHours" },
      ],
    });
    await tick();
    fixture.detectChanges();

    createObjectURL.mockClear();
    button(fixture, "Download error report")?.click();

    // No second request: the report is built from the response the page is already showing.
    httpMock.expectNone(() => true);
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toContain("text/csv");
    await expect(blob.text()).resolves.toBe(
      'line,reason\r\n2,invalid workloadHours\r\n3,"reason with a comma, a ""quote"" and more"',
    );
  });

  it("neutralizes a reason that a spreadsheet would run as a formula", async () => {
    const fixture = setup();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    fixture.detectChanges();
    startUpload(fixture);
    flushImport({
      totalRows: 2,
      successCount: 0,
      errorCount: 2,
      errors: [
        { line: 2, reason: '=HYPERLINK("http://evil.example","click")' },
        { line: 3, reason: "+1+1" },
      ],
    });
    await tick();
    fixture.detectChanges();

    createObjectURL.mockClear();
    button(fixture, "Download error report")?.click();

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    const csv = await blob.text();
    // Prefixed with an apostrophe so Excel and Sheets treat them as text. Quoting alone does not
    // help: the parser strips the quotes before deciding whether it has a formula.
    expect(csv).toContain(`2,"'=HYPERLINK(""http://evil.example"",""click"")"`);
    expect(csv).toContain("3,'+1+1");
  });

  it("offers the list once an import has produced certificates", async () => {
    const fixture = setup();
    fixture.detectChanges();
    startUpload(fixture);
    flushImport({ totalRows: 1, successCount: 1, errorCount: 0, errors: [] });
    await tick();
    fixture.detectChanges();

    const viewInList = [...el(fixture).querySelectorAll("a")].find(
      (link) => link.textContent?.trim() === "View in list",
    );
    expect(viewInList?.getAttribute("href")).toBe("/certificates");
  });

  it("shows a rejected upload as a single message with no counters", async () => {
    const fixture = setup();
    fixture.detectChanges();
    startUpload(fixture);

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/batch") && r.method === "POST")
      .flush(
        { status: 400, detail: "File exceeds the maximum allowed size." },
        { status: 400, statusText: "Bad Request" },
      );
    await tick();
    fixture.detectChanges();

    expect(el(fixture).textContent).toContain("File exceeds the maximum allowed size.");
    expect(counters(fixture)).toEqual({});
    expect(el(fixture).querySelector("table")).toBeNull();
  });

  it("returns to the picker state when starting a new upload after a result", async () => {
    const fixture = setup();
    fixture.detectChanges();
    startUpload(fixture);
    flushImport({ totalRows: 1, successCount: 1, errorCount: 0, errors: [] });
    await tick();
    fixture.detectChanges();

    button(fixture, "Upload another file")?.click();
    fixture.detectChanges();

    expect(el(fixture).querySelector("input[type='file']")).not.toBeNull();
    expect(counters(fixture)).toEqual({});
  });

  it("downloading the sample CSV requests the template endpoint", () => {
    const fixture = setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    fixture.detectChanges();

    button(fixture, "Download sample CSV")?.click();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/batch/template.csv"))
      .flush(new Blob(["recipient_name,recipient_email\n"]));
  });

  it("shows keyboard focus on the drop area, not on the hidden input", () => {
    const fixture = setup();
    fixture.detectChanges();

    const dropArea = el(fixture).querySelector("label[for='batch-upload-file']");
    // The input is visually hidden, so its own ring would be drawn around a 1x1 box and a
    // keyboard user would see nothing. The visible drop area has to carry the ring instead.
    expect(dropArea?.className).toContain("has-[:focus-visible]:outline-accent-500");
    expect(dropArea?.className).toContain("has-[:focus-visible]:border-accent-500");
  });

  it("reports a sample CSV download that fails, rather than appearing to do nothing", () => {
    const fixture = setup();
    fixture.detectChanges();

    button(fixture, "Download sample CSV")?.click();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/batch/template.csv"))
      .flush(null, { status: 500, statusText: "Internal Server Error" });
    fixture.detectChanges();

    expect(el(fixture).textContent).toContain("Could not download the sample CSV");
  });

  it("refuses a dropped file that is not a CSV, rather than letting the server refuse it", () => {
    const fixture = setup();
    fixture.detectChanges();

    dropFile(fixture, new File(["%PDF"], "certificate.pdf", { type: "application/pdf" }));

    expect(el(fixture).textContent).toContain("That file is not a CSV");
    expect(el(fixture).textContent).not.toContain("certificate.pdf");
    // Nothing left for the server to reject.
    httpMock.expectNone(() => true);
  });

  it("accepts a file dropped on the drop area", () => {
    const fixture = setup();
    fixture.detectChanges();

    dropFile(fixture, new File(["a,b\n"], "dropped.csv", { type: "text/csv" }));

    expect(el(fixture).textContent).toContain("dropped.csv");
    expect(button(fixture, "Upload")?.disabled).toBe(false);
  });
});
