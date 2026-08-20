import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from "@angular/router";
import { of } from "rxjs";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { ConfirmDialogService } from "../../../../shared/confirm-dialog/confirm-dialog.service";
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

/** The template cards are a radio group; each card is found by the name it shows. */
function templateCard(root: HTMLElement, label: string): HTMLButtonElement {
  const card = [...root.querySelectorAll<HTMLButtonElement>("[role='radio']")].find((button) =>
    button.textContent?.trim().startsWith(label),
  );
  if (!card) {
    throw new Error(`Expected the ${label} template card`);
  }
  return card;
}

function deleteButton(root: HTMLElement): HTMLButtonElement | undefined {
  return [...root.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent?.trim() === "Delete",
  );
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
    expect(templateCard(el, "Modern").getAttribute("aria-checked")).toBe("true");
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
    templateCard(el, "Minimal").click();
    fixture.detectChanges();

    expect(templateCard(el, "Minimal").getAttribute("aria-checked")).toBe("true");
    expect(templateCard(el, "Classic").getAttribute("aria-checked")).toBe("false");

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

  it("offers all three templates as cards rather than a list of names", () => {
    const fixture = setup("USER", null);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const group = el.querySelector("[role='radiogroup']");
    const labelId = group?.getAttribute("aria-labelledby");
    expect(el.querySelector(`#${labelId}`)?.textContent?.trim()).toBe("Template");

    const cards = [...el.querySelectorAll("[role='radio']")].map((card) =>
      card.textContent?.trim().replace(/\s+/g, " "),
    );
    expect(cards).toEqual(["Classic", "Modern", "Minimal"]);

    // Each card draws its own layout, which is the point of replacing the select.
    for (const tag of ["app-classic-thumbnail", "app-modern-thumbnail", "app-minimal-thumbnail"]) {
      const thumbnail = el.querySelector(`${tag} [aria-hidden='true']`);
      expect(thumbnail).not.toBeNull();
      // A4 landscape, matching `@page { size: A4 landscape }` in the Thymeleaf templates. The
      // ratio is also what gives the frame a definite height, without which every bar inside it
      // collapses to zero — which is how these shipped the first time.
      expect(thumbnail?.className).toContain("aspect-[1.414/1]");
    }
  });

  it("keeps the template cards to one tab stop and moves between them with the arrows", () => {
    const fixture = setup("USER", null);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const cards = [...el.querySelectorAll<HTMLButtonElement>("[role='radio']")];
    expect(cards.map((card) => card.tabIndex)).toEqual([0, -1, -1]);

    cards[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    fixture.detectChanges();

    expect(templateCard(el, "Modern").getAttribute("aria-checked")).toBe("true");
    expect(
      [...el.querySelectorAll<HTMLButtonElement>("[role='radio']")].map((card) => card.tabIndex),
    ).toEqual([-1, 0, -1]);

    // The group wraps, so ArrowLeft from the first card lands on the last.
    templateCard(el, "Modern").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    );
    fixture.detectChanges();
    expect(templateCard(el, "Classic").getAttribute("aria-checked")).toBe("true");
  });

  it("jumps to the first and last template with Home and End", () => {
    const fixture = setup("USER", null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    templateCard(el, "Classic").dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", bubbles: true }),
    );
    fixture.detectChanges();
    expect(templateCard(el, "Minimal").getAttribute("aria-checked")).toBe("true");

    templateCard(el, "Minimal").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
    );
    fixture.detectChanges();
    expect(templateCard(el, "Classic").getAttribute("aria-checked")).toBe("true");
  });

  it("leaves modified arrow keys to the browser", () => {
    const fixture = setup("USER", null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    // Ctrl/Meta + arrow is word navigation or a desktop switch, not a selection change.
    for (const modifier of ["ctrlKey", "metaKey", "altKey"]) {
      templateCard(el, "Classic").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, [modifier]: true }),
      );
      fixture.detectChanges();
      expect(templateCard(el, "Classic").getAttribute("aria-checked")).toBe("true");
    }
  });

  it("offers the PDF preview only once there is a saved certificate to preview", async () => {
    const createFixture = setup("USER", null);
    createFixture.detectChanges();
    expect(
      (createFixture.nativeElement as HTMLElement).querySelector("a[href$='/preview']"),
    ).toBeNull();

    TestBed.resetTestingModule();

    const editFixture = setup("USER", "7");
    editFixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7"))
      .flush({ ...VALID_VALUES, id: 7, code: "CERT-AAAA-BBBB", template: "CLASSIC", status: "ISSUED" });
    await tick();
    editFixture.detectChanges();

    const preview = (editFixture.nativeElement as HTMLElement).querySelector("a[href$='/preview']");
    expect(preview?.getAttribute("href")).toBe("/certificates/7/preview");
  });

  it("summarizes a blocked submit above the form, not only field by field", () => {
    const fixture = setup("USER", null);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    // Nothing has been submitted yet, so an empty form is not yet a form with errors.
    expect(el.textContent).not.toContain("Check the highlighted fields");

    submitForm(fixture);
    fixture.detectChanges();

    const summary = [...el.querySelectorAll("[role='alert']")].find((node) =>
      node.textContent?.includes("Check the highlighted fields"),
    );
    expect(summary).toBeDefined();
    // The per-field messages stay: the summary points at them, it does not replace them.
    expect(el.textContent).toContain("Recipient name is required.");
  });

  it("hides the delete action for a non-admin role in edit mode", async () => {
    const fixture = setup("USER", "7");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7"))
      .flush({ ...VALID_VALUES, id: 7, code: "CERT-AAAA-BBBB", template: "CLASSIC", status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    expect(deleteButton(fixture.nativeElement as HTMLElement)).toBeUndefined();
  });

  it("hides the delete action in create mode even for ADMIN", () => {
    const fixture = setup("ADMIN", null);
    fixture.detectChanges();

    expect(deleteButton(fixture.nativeElement as HTMLElement)).toBeUndefined();
  });

  it("ADMIN in edit mode: confirming delete deletes and navigates to the list", async () => {
    const fixture = setup("ADMIN", "7");
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, "navigateByUrl").mockResolvedValue(true);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7"))
      .flush({ ...VALID_VALUES, id: 7, code: "CERT-AAAA-BBBB", template: "CLASSIC", status: "ISSUED" });
    await tick();
    fixture.detectChanges();

    const deleteControl = deleteButton(fixture.nativeElement as HTMLElement);
    if (!deleteControl) {
      throw new Error("Expected the delete action on the edit form for an ADMIN");
    }

    // The confirmation is a plain injectable now, so a normal provider spy reaches the instance
    // the component resolved — the Material dialog's root-instance mismatch is gone with it.
    const confirmSpy = vi
      .spyOn(TestBed.inject(ConfirmDialogService), "confirm")
      .mockReturnValue(of(true));

    deleteControl.click();
    fixture.detectChanges();

    expect(confirmSpy).toHaveBeenCalled();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/7") && r.method === "DELETE")
      .flush(null);
    await tick();

    expect(navigateSpy).toHaveBeenCalledWith("/certificates");
  });
});
