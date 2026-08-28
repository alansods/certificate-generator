import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { ForgotPasswordPageComponent } from "./forgot-password-page.component";

describe("ForgotPasswordPageComponent", () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ForgotPasswordPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideNoopAnimations()],
    });
    httpMock = TestBed.inject(HttpTestingController);
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
    const fixture = TestBed.createComponent(ForgotPasswordPageComponent);
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      nativeElement,
      emailInput: requireElement<HTMLInputElement>(nativeElement, "input[formControlName='email']"),
      form: requireElement<HTMLFormElement>(nativeElement, "form"),
    };
  }

  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event("input"));
  }

  it("submits the email and shows a confirmation naming the address", () => {
    const { fixture, nativeElement, emailInput, form } = setup();

    type(emailInput, "jane@example.com");
    form.dispatchEvent(new Event("submit"));

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/forgot-password"));
    expect(req.request.body).toEqual({ email: "jane@example.com" });
    req.flush(null, { status: 202, statusText: "Accepted" });
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("jane@example.com");
    expect(nativeElement.querySelector("form")).toBeNull();
  });

  it("makes no request for a malformed email", () => {
    const { fixture, emailInput, form } = setup();

    type(emailInput, "not-an-email");
    form.dispatchEvent(new Event("submit"));
    fixture.detectChanges();

    // httpMock.verify() in afterEach asserts no request went out.
    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(fixture.nativeElement.textContent).toContain("A valid email is required.");
  });

  it("returns the empty form when 'use another email' is selected", () => {
    const { fixture, nativeElement, emailInput, form } = setup();

    type(emailInput, "jane@example.com");
    form.dispatchEvent(new Event("submit"));
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/forgot-password"))
      .flush(null, { status: 202, statusText: "Accepted" });
    fixture.detectChanges();

    const useAnother = requireElement<HTMLButtonElement>(nativeElement, "button");
    useAnother.click();
    fixture.detectChanges();

    const newEmailInput = requireElement<HTMLInputElement>(nativeElement, "input[formControlName='email']");
    expect(newEmailInput.value).toBe("");
  });

  it("shows a distinct message on rate limiting", () => {
    const { fixture, nativeElement, emailInput, form } = setup();

    type(emailInput, "jane@example.com");
    form.dispatchEvent(new Event("submit"));
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/forgot-password"))
      .flush({ status: 429, title: "Too many requests" }, { status: 429, statusText: "Too Many Requests" });
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Too many attempts");
  });

  it("shows the cold-start message only once the request has run past the threshold", () => {
    vi.useFakeTimers();
    try {
      const { fixture, nativeElement, emailInput, form } = setup();

      type(emailInput, "jane@example.com");
      form.dispatchEvent(new Event("submit"));
      fixture.detectChanges();
      expect(nativeElement.textContent).not.toContain("waking up");

      vi.advanceTimersByTime(5000);
      fixture.detectChanges();
      expect(nativeElement.textContent).toContain("waking up");

      httpMock
        .expectOne((r) => r.url.endsWith("/api/v1/auth/forgot-password"))
        .flush(null, { status: 202, statusText: "Accepted" });
      fixture.detectChanges();
      expect(nativeElement.textContent).not.toContain("waking up");
    } finally {
      vi.useRealTimers();
    }
  });

  it("never shows the cold-start message for a fast response", () => {
    vi.useFakeTimers();
    try {
      const { fixture, nativeElement, emailInput, form } = setup();

      type(emailInput, "jane@example.com");
      form.dispatchEvent(new Event("submit"));
      httpMock
        .expectOne((r) => r.url.endsWith("/api/v1/auth/forgot-password"))
        .flush(null, { status: 202, statusText: "Accepted" });
      fixture.detectChanges();

      vi.advanceTimersByTime(10000);
      fixture.detectChanges();
      expect(nativeElement.textContent).not.toContain("waking up");
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers a link back to sign in", () => {
    const { nativeElement } = setup();

    const link = requireElement<HTMLAnchorElement>(nativeElement, "a[href='/login']");

    expect(link.textContent?.trim()).toBe("Sign in");
  });
});
