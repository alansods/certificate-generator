import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { VerifyPageComponent } from "./verify-page.component";

/** See certificate-list-page.component.spec.ts for why this is used instead of fixture.whenStable(). */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const VALID_RESPONSE = {
  recipientName: "Jane Doe",
  courseName: "Advanced Angular",
  workloadHours: 40,
  issueDate: "2026-05-15",
};

describe("VerifyPageComponent", () => {
  let httpMock: HttpTestingController;

  function setup(initialCode: string) {
    const paramMap$ = new BehaviorSubject(
      initialCode ? convertToParamMap({ code: initialCode }) : convertToParamMap({}),
    );
    TestBed.configureTestingModule({
      imports: [VerifyPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return { fixture: TestBed.createComponent(VerifyPageComponent), paramMap$ };
  }

  function codeField(fixture: { nativeElement: unknown }): HTMLInputElement {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      "form input",
    );
    if (!input) {
      throw new Error("Expected the code field to be rendered");
    }
    return input;
  }

  /** `requestSubmit()` rather than a bare submit event: it runs the same algorithm the browser's
   * implicit submission does, so the test exercises the path a user actually takes. */
  function submitForm(fixture: { nativeElement: unknown }): void {
    const form = (fixture.nativeElement as HTMLElement).querySelector("form");
    if (!form) {
      throw new Error("Expected the lookup form to be rendered");
    }
    form.requestSubmit();
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  function flushVerify(code: string, body: object) {
    httpMock
      .expectOne((r) => r.url.endsWith(`/api/v1/public/verify/${code}`) && r.method === "GET")
      .flush(body);
  }

  it("shows recipient details and a valid badge for an ISSUED certificate", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("Jane Doe");
    expect(text).toContain("Advanced Angular");
    expect(text).toContain("Valid certificate");
  });

  it("shows a revoked warning alongside the certificate's details for a REVOKED certificate", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "REVOKED" });
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("Jane Doe");
    expect(text).toContain("Certificate revoked");
  });

  it("shows a not-yet-issued indicator for a DRAFT certificate", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "DRAFT" });
    await tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Not yet issued");
  });

  it("shows a not-found message for an unknown code", async () => {
    const { fixture } = setup("CERT-ZZZZ-9999");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/public/verify/CERT-ZZZZ-9999"))
      .flush(null, { status: 404, statusText: "Not Found" });
    await tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "No certificate found",
    );
  });

  it("shows a rate-limited message on 429", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/public/verify/CERT-AAAA-BBBB"))
      .flush(null, { status: 429, statusText: "Too Many Requests" });
    await tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Too many checks",
    );
  });

  it("shows a generic error message and a working retry on a 500", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/public/verify/CERT-AAAA-BBBB"))
      .flush(null, { status: 500, statusText: "Internal Server Error" });
    await tick();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain(
      "Something went wrong",
    );

    // Not `querySelector("button")`: the lookup form's own submit button comes first in the DOM.
    const retryButton = [...nativeElement.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Retry",
    );
    if (!retryButton) {
      throw new Error("Expected a Retry button in the error state");
    }
    retryButton.click();
    fixture.detectChanges();

    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "ISSUED" });
    await tick();
    fixture.detectChanges();
    expect(nativeElement.textContent).toContain("Jane Doe");
  });

  it("escapes a malicious recipient/course name instead of rendering it as markup", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    flushVerify("CERT-AAAA-BBBB", {
      recipientName: "<img src=x onerror=alert(1)>",
      courseName: "<script>alert(2)</script>",
      workloadHours: 40,
      issueDate: "2026-05-15",
      status: "ISSUED",
    });
    await tick();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector("img")).toBeNull();
    expect(nativeElement.querySelector("script")).toBeNull();
    expect(nativeElement.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(nativeElement.textContent).toContain("<script>alert(2)</script>");
  });

  it("re-fetches and re-renders when the route's code param changes without the component being destroyed", async () => {
    const { fixture, paramMap$ } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "ISSUED" });
    await tick();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Jane Doe");

    paramMap$.next(convertToParamMap({ code: "CERT-CCCC-DDDD" }));
    fixture.detectChanges();
    flushVerify("CERT-CCCC-DDDD", {
      recipientName: "John Smith",
      courseName: "Intro to Rust",
      workloadHours: 20,
      issueDate: "2026-06-01",
      status: "ISSUED",
    });
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("John Smith");
    expect(text).not.toContain("Jane Doe");
  });

  it("renders an empty form and makes no request when opened without a code", () => {
    const { fixture } = setup("");
    fixture.detectChanges();

    expect(codeField(fixture).value).toBe("");
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain("No certificate found");
    // httpMock.verify() in afterEach is the assertion that nothing was requested.
  });

  it("rejects a malformed code inline without calling the API", async () => {
    const { fixture } = setup("");
    fixture.detectChanges();

    const input = codeField(fixture);
    input.value = "NOPE";
    input.dispatchEvent(new Event("input"));
    submitForm(fixture);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Use the format");
  });

  it("navigates to the code's own URL on submit, so the result stays linkable", async () => {
    const { fixture } = setup("");
    const navigateSpy = vi.spyOn(TestBed.inject(Router), "navigate");
    fixture.detectChanges();

    const input = codeField(fixture);
    input.value = "cert-7k2m-9xq4";
    input.dispatchEvent(new Event("input"));
    submitForm(fixture);

    expect(navigateSpy).toHaveBeenCalledWith(["/verify", "CERT-7K2M-9XQ4"]);
  });

  it("shows the code it is checking while the lookup is in flight", () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Checking CERT-AAAA-BBBB");

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/public/verify/CERT-AAAA-BBBB"))
      .flush({
        recipientName: "Jane",
        courseName: "Angular",
        workloadHours: 40,
        issueDate: "2026-05-15",
        status: "ISSUED",
      });
  });

  it("pre-fills the field from the URL so a shared link can be corrected", () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();

    expect(codeField(fixture).value).toBe("CERT-AAAA-BBBB");

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/public/verify/CERT-AAAA-BBBB"))
      .flush({
        recipientName: "Jane",
        courseName: "Angular",
        workloadHours: 40,
        issueDate: "2026-05-15",
        status: "ISSUED",
      });
  });

  it("treats a malformed code in the URL as a typo rather than a missing certificate", () => {
    const { fixture } = setup("not-a-code");
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";

    expect(text).toContain("Use the format");
    expect(text).not.toContain("No certificate found");
    // httpMock.verify() in afterEach asserts the API was never called.
  });

  it("normalizes a lowercase code from a shared link before looking it up", () => {
    const { fixture } = setup("cert-7k2m-9xq4");
    fixture.detectChanges();

    expect(codeField(fixture).value).toBe("CERT-7K2M-9XQ4");

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/public/verify/CERT-7K2M-9XQ4"))
      .flush({ ...VALID_RESPONSE, status: "ISSUED" });
  });

  it("keeps the field in step with the URL when the code changes after first render", async () => {
    const { fixture, paramMap$ } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    paramMap$.next(convertToParamMap({ code: "CERT-CCCC-DDDD" }));
    fixture.detectChanges();

    expect(codeField(fixture).value).toBe("CERT-CCCC-DDDD");

    flushVerify("CERT-CCCC-DDDD", { ...VALID_RESPONSE, status: "ISSUED" });
    await tick();
  });

  it("keeps every detail readable on a revoked certificate, dimming only the values", async () => {
    const { fixture } = setup("CERT-AAAA-BBBB");
    fixture.detectChanges();
    flushVerify("CERT-AAAA-BBBB", { ...VALID_RESPONSE, status: "REVOKED" });
    await tick();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const text = nativeElement.textContent ?? "";

    expect(text).toContain("Certificate revoked");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("Advanced Angular");
    expect(text).toContain("40 hours");
    expect(text).toContain("2026-05-15");

    const list = nativeElement.querySelector("dl");

    expect(list?.classList.contains("values-dimmed")).toBe(true);
  });

  it("labels the code field for assistive technology", () => {
    const { fixture } = setup("");
    fixture.detectChanges();

    const label = (fixture.nativeElement as HTMLElement).querySelector("label span.sr-only");

    expect(label?.textContent?.trim()).toBe("Certificate code");
  });

  it("offers a way back to sign in", () => {
    const { fixture } = setup("");
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      "a[href='/login']",
    );

    expect(link?.textContent?.trim()).toBe("Sign in");
  });
});
