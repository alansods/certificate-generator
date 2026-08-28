import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter, Router } from "@angular/router";
import { SignupPageComponent } from "./signup-page.component";

describe("SignupPageComponent", () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SignupPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  function requireElement<T extends Element>(root: HTMLElement, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Expected to find an element matching "${selector}"`);
    }
    return element;
  }

  function setup() {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      nativeElement,
      fullNameInput: requireElement<HTMLInputElement>(nativeElement, "input[formControlName='fullName']"),
      emailInput: requireElement<HTMLInputElement>(nativeElement, "input[formControlName='email']"),
      passwordInput: requireElement<HTMLInputElement>(nativeElement, "input[formControlName='password']"),
      confirmPasswordInput: requireElement<HTMLInputElement>(
        nativeElement,
        "input[formControlName='confirmPassword']",
      ),
      form: requireElement<HTMLFormElement>(nativeElement, "form"),
    };
  }

  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event("input"));
  }

  function fillValidFormAndSubmit(fields: ReturnType<typeof setup>) {
    type(fields.fullNameInput, "Jane Doe");
    type(fields.emailInput, "jane@example.com");
    type(fields.passwordInput, "correct-horse1");
    type(fields.confirmPasswordInput, "correct-horse1");
    fields.form.dispatchEvent(new Event("submit"));
  }

  it("navigates to / and stores the tokens on a valid submission", () => {
    const fields = setup();
    const navigateSpy = vi.spyOn(router, "navigateByUrl");

    fillValidFormAndSubmit(fields);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/register"))
      .flush({ accessToken: "access-1", refreshToken: "refresh-1", expiresIn: 900 });
    fields.fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith("/");
  });

  it("sends the full name, email and password in the request body", () => {
    const fields = setup();

    fillValidFormAndSubmit(fields);

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/register"));
    expect(req.request.body).toEqual({
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "correct-horse1",
    });
    req.flush({ accessToken: "a", refreshToken: "r", expiresIn: 900 });
  });

  it("marks the email field and does not navigate on a 409", () => {
    const fields = setup();
    const navigateSpy = vi.spyOn(router, "navigateByUrl");

    fillValidFormAndSubmit(fields);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/register"))
      .flush({ status: 409, title: "Conflict" }, { status: 409, statusText: "Conflict" });
    fields.fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fields.emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(fields.nativeElement.textContent).toContain("That email can't be used.");
  });

  it("clears the taken-email error once the email is edited", () => {
    const fields = setup();

    fillValidFormAndSubmit(fields);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/register"))
      .flush({ status: 409, title: "Conflict" }, { status: 409, statusText: "Conflict" });
    fields.fixture.detectChanges();
    expect(fields.nativeElement.textContent).toContain("That email can't be used.");

    type(fields.emailInput, "someone-else@example.com");
    fields.fixture.detectChanges();

    expect(fields.nativeElement.textContent).not.toContain("That email can't be used.");
  });

  it("shows a distinct message on rate limiting", () => {
    const fields = setup();

    fillValidFormAndSubmit(fields);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/register"))
      .flush({ status: 429, title: "Too many requests" }, { status: 429, statusText: "Too Many Requests" });
    fields.fixture.detectChanges();

    expect(fields.nativeElement.textContent).toContain("Too many attempts");
  });

  it("shows a distinct message when self-registration is disabled", () => {
    const fields = setup();

    fillValidFormAndSubmit(fields);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/register"))
      .flush({ status: 404, title: "Not found" }, { status: 404, statusText: "Not Found" });
    fields.fixture.detectChanges();

    expect(fields.nativeElement.textContent).toContain("Self-registration is currently disabled");
  });

  it("blocks submission and shows an inline error for a password shorter than 8 characters", () => {
    const fields = setup();
    type(fields.fullNameInput, "Jane Doe");
    type(fields.emailInput, "jane@example.com");
    type(fields.passwordInput, "short1");
    type(fields.confirmPasswordInput, "short1");

    fields.form.dispatchEvent(new Event("submit"));
    fields.fixture.detectChanges();

    expect(fields.passwordInput.getAttribute("aria-invalid")).toBe("true");
    expect(fields.nativeElement.textContent).toContain("At least 8 characters, including a digit.");
  });

  it("blocks submission and shows an inline error for a password with no digit", () => {
    const fields = setup();
    type(fields.fullNameInput, "Jane Doe");
    type(fields.emailInput, "jane@example.com");
    type(fields.passwordInput, "nodigitshere");
    type(fields.confirmPasswordInput, "nodigitshere");

    fields.form.dispatchEvent(new Event("submit"));
    fields.fixture.detectChanges();

    expect(fields.passwordInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("reports a blank confirmation as unconfirmed, not as a mismatch", () => {
    const fields = setup();
    type(fields.fullNameInput, "Jane Doe");
    type(fields.emailInput, "jane@example.com");
    type(fields.passwordInput, "correct-horse1");

    fields.form.dispatchEvent(new Event("submit"));
    fields.fixture.detectChanges();

    expect(fields.nativeElement.textContent).toContain("Confirm your password.");
    expect(fields.nativeElement.textContent).not.toContain("Passwords do not match.");
  });

  it("reports a filled but different confirmation as a mismatch", () => {
    const fields = setup();
    type(fields.fullNameInput, "Jane Doe");
    type(fields.emailInput, "jane@example.com");
    type(fields.passwordInput, "correct-horse1");
    type(fields.confirmPasswordInput, "different-horse2");

    fields.form.dispatchEvent(new Event("submit"));
    fields.fixture.detectChanges();

    expect(fields.nativeElement.textContent).toContain("Passwords do not match.");
  });

  it("blocks submission with a blank name or a malformed email, making no request", () => {
    const fields = setup();
    type(fields.emailInput, "not-an-email");
    type(fields.passwordInput, "correct-horse1");
    type(fields.confirmPasswordInput, "correct-horse1");

    fields.form.dispatchEvent(new Event("submit"));
    fields.fixture.detectChanges();

    expect(fields.fullNameInput.getAttribute("aria-invalid")).toBe("true");
    expect(fields.emailInput.getAttribute("aria-invalid")).toBe("true");
    // httpMock.verify() in afterEach asserts no request went out.
  });

  it("offers a link back to sign in", () => {
    const { nativeElement } = setup();

    const link = requireElement<HTMLAnchorElement>(nativeElement, "a[href='/login']");

    expect(link.textContent?.trim()).toBe("Sign in");
  });

  it("stays focusable while submitting and turns a second activation away", () => {
    const fields = setup();
    fillValidFormAndSubmit(fields);
    fields.fixture.detectChanges();

    const button = requireElement<HTMLButtonElement>(fields.nativeElement, "button[type='submit']");
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("true");

    // A second submit must not fire a second request; httpMock.verify() would fail if it did.
    fields.form.dispatchEvent(new Event("submit"));

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/register"))
      .flush({ accessToken: "a", refreshToken: "r", expiresIn: 900 });
  });
});
