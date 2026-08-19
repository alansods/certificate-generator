import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { VerifyCodePageComponent } from "./verify-code-page.component";

const VALID_RESPONSE = {
  recipientName: "Jane Doe",
  courseName: "Advanced Angular",
  workloadHours: 40,
  issueDate: "2026-05-15",
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("VerifyCodePageComponent", () => {
  let httpMock: HttpTestingController;

  function setup(initialCode: string) {
    const queryParamMap$ = new BehaviorSubject(
      initialCode ? convertToParamMap({ code: initialCode }) : convertToParamMap({}),
    );
    TestBed.configureTestingModule({
      imports: [VerifyCodePageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParamMap$ } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return { fixture: TestBed.createComponent(VerifyCodePageComponent), queryParamMap$ };
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  function codeField(fixture: { nativeElement: unknown }): HTMLInputElement {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>("form input");
    if (!input) {
      throw new Error("Expected the code field to be rendered");
    }
    return input;
  }

  function submitForm(fixture: { nativeElement: unknown }): void {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLFormElement>("form")?.requestSubmit();
  }

  function flushVerify(code: string, body: object) {
    httpMock.expectOne((r) => r.url.endsWith(`/api/v1/public/verify/${code}`)).flush(body);
  }

  it("renders an empty form and makes no request when opened with nothing entered", () => {
    const { fixture } = setup("");
    fixture.detectChanges();

    expect(codeField(fixture).value).toBe("");
    // httpMock.verify() asserts nothing was requested.
  });

  it("looks up the code the top bar handed over, without the user retyping it", async () => {
    const { fixture } = setup("CERT-7K2M-9XQ4");
    fixture.detectChanges();

    expect(codeField(fixture).value).toBe("CERT-7K2M-9XQ4");

    flushVerify("CERT-7K2M-9XQ4", { ...VALID_RESPONSE, status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Valid certificate");
  });

  it("rejects a malformed code inline without calling the API", () => {
    const { fixture } = setup("");
    fixture.detectChanges();

    const input = codeField(fixture);
    input.value = "NOPE";
    input.dispatchEvent(new Event("input"));
    submitForm(fixture);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Use the format");
  });

  it("treats a malformed code in the query string as a typo, not a missing certificate", () => {
    const { fixture } = setup("nonsense");
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";

    expect(text).toContain("Use the format");
    expect(text).not.toContain("No certificate found");
  });

  it("shows the code being checked while the lookup is in flight", () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Checking CERT-AAAA-BBBB");

    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "ISSUED" });
  });

  it("keeps a revoked certificate's details visible", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "REVOKED" });
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";

    expect(text).toContain("Certificate revoked");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("2026-05-15");
  });

  it("shows a not-found treatment naming the code that was checked", async () => {
    const { fixture } = setup("CERT-ZZZZ-9999");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/public/verify/CERT-ZZZZ-9999"))
      .flush(null, { status: 404, statusText: "Not Found" });
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";

    expect(text).toContain("No certificate found");
    expect(text).toContain("CERT-ZZZZ-9999");
  });

  it("shows a rate-limited treatment distinct from a not-found result", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/public/verify/CERT-AAAA-BBBB"))
      .flush(null, { status: 429, statusText: "Too Many Requests" });
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";

    expect(text).toContain("Too many checks");
    expect(text).not.toContain("No certificate found");
  });

  it("navigates with the code in the query string so the lookup stays linkable", () => {
    const { fixture } = setup("");
    const navigateSpy = vi.spyOn(TestBed.inject(Router), "navigate");
    fixture.detectChanges();

    const input = codeField(fixture);
    input.value = "cert-7k2m-9xq4";
    input.dispatchEvent(new Event("input"));
    submitForm(fixture);

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { code: "CERT-7K2M-9XQ4" } }),
    );
  });

  it("shows a not-yet-issued treatment for a certificate that has not been issued", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "DRAFT" });
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";

    expect(text).toContain("Not yet issued");
    expect(text).not.toContain("Valid certificate");
    expect(text).not.toContain("Certificate revoked");
  });

  it("offers a retry when the lookup fails for any other reason", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/public/verify/CERT-AAAA-BBBB"))
      .flush(null, { status: 500, statusText: "Internal Server Error" });
    await tick();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain("Something went wrong");
    expect(nativeElement.textContent).not.toContain("No certificate found");

    const retry = [...nativeElement.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Retry",
    );
    if (!retry) {
      throw new Error("Expected a retry action on the generic error state");
    }
    retry.click();
    fixture.detectChanges();

    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "ISSUED" });
    await tick();
  });

  it("re-runs the lookup when the code already in the URL is submitted again", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    submitForm(fixture);
    fixture.detectChanges();

    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "ISSUED" });
    await tick();
  });
});
