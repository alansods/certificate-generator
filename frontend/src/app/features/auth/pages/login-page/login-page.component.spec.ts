import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter, Router } from "@angular/router";
import { LoginPageComponent } from "./login-page.component";

describe("LoginPageComponent", () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
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
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    const emailInput = requireElement<HTMLInputElement>(nativeElement, "input[formControlName='email']");
    const passwordInput = requireElement<HTMLInputElement>(
      nativeElement,
      "input[formControlName='password']",
    );
    const form = requireElement<HTMLFormElement>(nativeElement, "form");
    return { fixture, nativeElement, emailInput, passwordInput, form };
  }

  function fillAndSubmit(emailInput: HTMLInputElement, passwordInput: HTMLInputElement, form: HTMLFormElement) {
    emailInput.value = "jane@example.com";
    emailInput.dispatchEvent(new Event("input"));
    passwordInput.value = "secret";
    passwordInput.dispatchEvent(new Event("input"));
    form.dispatchEvent(new Event("submit"));
  }

  it("navigates to / on valid credentials", () => {
    const { fixture, emailInput, passwordInput, form } = setup();
    const navigateSpy = vi.spyOn(router, "navigateByUrl");

    fillAndSubmit(emailInput, passwordInput, form);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/login"))
      .flush({ accessToken: "access-1", refreshToken: "refresh-1", expiresIn: 900 });
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith("/");
  });

  it("shows an inline error and does not navigate on invalid credentials", () => {
    const { fixture, nativeElement, emailInput, passwordInput, form } = setup();
    const navigateSpy = vi.spyOn(router, "navigateByUrl");

    fillAndSubmit(emailInput, passwordInput, form);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/login"))
      .flush(
        { status: 401, title: "Unauthorized" },
        { status: 401, statusText: "Unauthorized" },
      );
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(nativeElement.textContent).toContain("Invalid email or password");
  });

  it("shows a distinct message on rate limiting", () => {
    const { fixture, nativeElement, emailInput, passwordInput, form } = setup();

    fillAndSubmit(emailInput, passwordInput, form);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/login"))
      .flush(
        { status: 429, title: "Too many requests" },
        { status: 429, statusText: "Too Many Requests" },
      );
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Too many attempts");
  });

  it("shows the cold-start message only once the request has run past the threshold", () => {
    vi.useFakeTimers();
    try {
      const { fixture, nativeElement, emailInput, passwordInput, form } = setup();

      fillAndSubmit(emailInput, passwordInput, form);
      fixture.detectChanges();
      expect(nativeElement.textContent).not.toContain("waking up");

      vi.advanceTimersByTime(5000);
      fixture.detectChanges();
      expect(nativeElement.textContent).toContain("waking up");

      httpMock
        .expectOne((r) => r.url.endsWith("/api/v1/auth/login"))
        .flush({ accessToken: "access-1", refreshToken: "refresh-1", expiresIn: 900 });
      fixture.detectChanges();
      expect(nativeElement.textContent).not.toContain("waking up");
    } finally {
      vi.useRealTimers();
    }
  });

  it("never shows the cold-start message for a fast response", () => {
    vi.useFakeTimers();
    try {
      const { fixture, nativeElement, emailInput, passwordInput, form } = setup();

      fillAndSubmit(emailInput, passwordInput, form);
      httpMock
        .expectOne((r) => r.url.endsWith("/api/v1/auth/login"))
        .flush({ accessToken: "access-1", refreshToken: "refresh-1", expiresIn: 900 });
      fixture.detectChanges();

      vi.advanceTimersByTime(10000);
      fixture.detectChanges();
      expect(nativeElement.textContent).not.toContain("waking up");
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers a link to public verification for someone without an account", () => {
    const { nativeElement } = setup();

    const link = requireElement<HTMLAnchorElement>(nativeElement, "a[href='/verify']");

    expect(link.textContent?.trim()).toBe("Verify a code");
  });

  it("keeps the submit button reachable and gives it the specified interaction states", () => {
    const { nativeElement } = setup();

    const button = requireElement<HTMLButtonElement>(nativeElement, "button[type='submit']");

    // The four states the shell's "Interaction states are uniform" requirement asks for. Focus is
    // the global rule and is deliberately absent here.
    expect(button.className).toContain("hover:bg-accent-900");
    expect(button.className).toContain("active:bg-accent-800");
    expect(button.className).toContain("disabled:opacity-45");
    expect(button.className).toContain("disabled:pointer-events-none");
  });

  it("surfaces a required-field error on blur alone, with no keystroke to trigger it", () => {
    // The case that distinguishes `form.events` from `statusChanges`: leaving an untouched field
    // changes `touched` but not the validation status, so a status-only subscription never ticks
    // and the message stays hidden.
    const { fixture, nativeElement, emailInput } = setup();
    emailInput.dispatchEvent(new Event("blur"));
    fixture.detectChanges();

    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(emailInput.getAttribute("aria-describedby")).toBe("email-error");
    expect(requireElement<HTMLElement>(nativeElement, "#email-error").textContent).toContain(
      "A valid email is required.",
    );
  });
});
