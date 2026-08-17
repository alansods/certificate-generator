import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap } from "@angular/router";
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
    const paramMap$ = new BehaviorSubject(convertToParamMap({ code: initialCode }));
    TestBed.configureTestingModule({
      imports: [VerifyPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return { fixture: TestBed.createComponent(VerifyPageComponent), paramMap$ };
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
    expect(text).toContain("Revoked");
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
    const { fixture } = setup("UNKNOWN-CODE");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/public/verify/UNKNOWN-CODE"))
      .flush(null, { status: 404, statusText: "Not Found" });
    await tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "No certificate was found for this code.",
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
      "Too many verification attempts",
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
      "Something went wrong while checking this certificate.",
    );

    const retryButton = nativeElement.querySelector("button");
    retryButton?.click();
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
});
