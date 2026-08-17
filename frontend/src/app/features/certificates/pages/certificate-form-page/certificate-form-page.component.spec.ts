import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from "@angular/router";
import { of } from "rxjs";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { CertificateFormPageComponent } from "./certificate-form-page.component";

function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (value: string) =>
    btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${base64url(JSON.stringify({ alg: "HS256" }))}.${base64url(JSON.stringify(payload))}.sig`;
}

/** See certificate-list-page.component.spec.ts for why this is used instead of fixture.whenStable(). */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function setInputValue(root: HTMLElement, controlName: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(`[formcontrolname='${controlName}']`);
  if (!input) {
    throw new Error(`Expected to find control ${controlName}`);
  }
  input.value = value;
  input.dispatchEvent(new Event("input"));
}

const VALID_VALUES = {
  recipientName: "Jane Doe",
  recipientEmail: "jane@example.com",
  courseName: "Advanced Angular",
  workloadHours: 40,
  completionDate: "2026-05-12",
  issueDate: "2026-05-15",
  instructorName: "John Smith",
};

describe("CertificateFormPageComponent", () => {
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;

  function setup(role: string, id: string | null) {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CertificateFormPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
    tokenStorage.setTokens(fakeJwt({ role }), "refresh-1");
    return TestBed.createComponent(CertificateFormPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  function fillValidForm(fixture: ReturnType<typeof setup>) {
    const el = fixture.nativeElement as HTMLElement;
    setInputValue(el, "recipientName", VALID_VALUES.recipientName);
    setInputValue(el, "recipientEmail", VALID_VALUES.recipientEmail);
    setInputValue(el, "courseName", VALID_VALUES.courseName);
    setInputValue(el, "workloadHours", String(VALID_VALUES.workloadHours));
    setInputValue(el, "completionDate", VALID_VALUES.completionDate);
    setInputValue(el, "issueDate", VALID_VALUES.issueDate);
    setInputValue(el, "instructorName", VALID_VALUES.instructorName);
    fixture.detectChanges();
  }

  function submitForm(fixture: ReturnType<typeof setup>) {
    (fixture.nativeElement as HTMLElement).querySelector("form")?.dispatchEvent(new Event("submit"));
  }

  it("create mode submits and navigates to the list on success", async () => {
    const fixture = setup("USER", null);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, "navigateByUrl").mockResolvedValue(true);
    fixture.detectChanges();

    fillValidForm(fixture);
    submitForm(fixture);

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates") && r.method === "POST",
    );
    expect(req.request.body).toEqual({ ...VALID_VALUES, template: "CLASSIC" });
    req.flush({ id: 1, code: "CERT-AAAA-BBBB" });
    await tick();

    expect(navigateSpy).toHaveBeenCalledWith("/certificates");
  });

  it("edit mode loads and pre-fills the existing certificate", async () => {
    const fixture = setup("USER", "7");
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "GET")
      .flush({ ...VALID_VALUES, id: 7, code: "CERT-AAAA-BBBB", template: "MODERN", status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector<HTMLInputElement>("[formcontrolname='recipientName']")?.value).toBe(
      "Jane Doe",
    );
    expect(
      el.querySelector(".certificate-form-page__preview--modern")?.getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("edit mode submits an update and navigates to the list on success", async () => {
    const fixture = setup("USER", "7");
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, "navigateByUrl").mockResolvedValue(true);
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "GET")
      .flush({ ...VALID_VALUES, id: 7, code: "CERT-AAAA-BBBB", template: "CLASSIC", status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    setInputValue(fixture.nativeElement as HTMLElement, "courseName", "Updated Course");
    submitForm(fixture);

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "PUT",
    );
    expect(req.request.body).toEqual({ ...VALID_VALUES, courseName: "Updated Course", template: "CLASSIC" });
    req.flush({ id: 7, code: "CERT-AAAA-BBBB" });
    await tick();

    expect(navigateSpy).toHaveBeenCalledWith("/certificates");
  });

  it("selecting a template preview updates the selected state and the submitted value", async () => {
    const fixture = setup("USER", null);
    const router = TestBed.inject(Router);
    vi.spyOn(router, "navigateByUrl").mockResolvedValue(true);
    fixture.detectChanges();
    fillValidForm(fixture);

    const el = fixture.nativeElement as HTMLElement;
    const minimalCard = el.querySelector<HTMLButtonElement>(".certificate-form-page__preview--minimal");
    minimalCard?.click();
    fixture.detectChanges();

    expect(minimalCard?.getAttribute("aria-pressed")).toBe("true");
    expect(
      el.querySelector(".certificate-form-page__preview--classic")?.getAttribute("aria-pressed"),
    ).toBe("false");

    submitForm(fixture);
    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates") && r.method === "POST",
    );
    expect(req.request.body).toEqual({ ...VALID_VALUES, template: "MINIMAL" });
    req.flush({ id: 1, code: "CERT-AAAA-BBBB" });
    await tick();
  });

  it("shows server-side field errors on the matching controls, including fields beyond the first two", async () => {
    const fixture = setup("USER", null);
    fixture.detectChanges();

    fillValidForm(fixture);
    submitForm(fixture);

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates") && r.method === "POST")
      .flush(
        {
          status: 400,
          fieldErrors: {
            recipientEmail: "must be a valid email",
            courseName: "must not be blank",
          },
        },
        { status: 400, statusText: "Bad Request" },
      );
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("must be a valid email");
    expect(text).toContain("must not be blank");
  });

  it("blocks submission without a request when the form is invalid", () => {
    const fixture = setup("USER", null);
    fixture.detectChanges();

    submitForm(fixture);
    fixture.detectChanges();

    httpMock.expectNone((r) => r.url.endsWith("/api/v1/certificates"));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("Recipient name is required.");
  });

  it("hides the delete action for a non-admin role in edit mode", async () => {
    const fixture = setup("USER", "7");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7"))
      .flush({ ...VALID_VALUES, id: 7, code: "CERT-AAAA-BBBB", template: "CLASSIC", status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    const deleteButton = (fixture.nativeElement as HTMLElement).querySelector("button[color='warn']");
    expect(deleteButton).toBeNull();
  });

  it("hides the delete action in create mode even for ADMIN", () => {
    const fixture = setup("ADMIN", null);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector("button[color='warn']")).toBeNull();
  });

  it("ADMIN in edit mode: confirming delete calls MatDialog, deletes, and navigates to the list", async () => {
    // The dialog itself is stubbed by direct field assignment rather than a TestBed provider
    // override — see certificate-list-page.component.spec.ts for why (MatDialog's providedIn:'root'
    // instance resolved by this component doesn't match the one TestBed.inject(MatDialog) returns
    // in this Vitest/esbuild setup). The click itself is real, exercising the actual button binding.
    const fixture = setup("ADMIN", "7");
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, "navigateByUrl").mockResolvedValue(true);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7"))
      .flush({ ...VALID_VALUES, id: 7, code: "CERT-AAAA-BBBB", template: "CLASSIC", status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    const deleteButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      "button[color='warn']",
    );
    expect(deleteButton).not.toBeNull();

    const openSpy = vi.fn().mockReturnValue({ afterClosed: () => of(true) });
    (fixture.componentInstance as unknown as { dialog: { open: unknown } }).dialog = {
      open: openSpy,
    };

    deleteButton?.click();
    fixture.detectChanges();

    expect(openSpy).toHaveBeenCalled();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "DELETE")
      .flush(null);
    await tick();

    expect(navigateSpy).toHaveBeenCalledWith("/certificates");
  });
});
