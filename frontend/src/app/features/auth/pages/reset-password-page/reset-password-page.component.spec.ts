import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { ActivatedRoute, convertToParamMap, provideRouter } from "@angular/router";
import { ResetPasswordPageComponent } from "./reset-password-page.component";

describe("ResetPasswordPageComponent", () => {
  let httpMock: HttpTestingController;

  afterEach(() => httpMock.verify());

  function requireElement<T extends Element>(root: HTMLElement, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Expected to find an element matching "${selector}"`);
    }
    return element;
  }

  function setup(token: string | null = "raw-reset-token") {
    TestBed.configureTestingModule({
      imports: [ResetPasswordPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ResetPasswordPageComponent);
    fixture.detectChanges();
    const nativeElement = fixture.nativeElement as HTMLElement;
    return { fixture, nativeElement };
  }

  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event("input"));
  }

  function fillValidFormAndSubmit(nativeElement: HTMLElement) {
    const newPasswordInput = requireElement<HTMLInputElement>(
      nativeElement,
      "input[formControlName='newPassword']",
    );
    const confirmPasswordInput = requireElement<HTMLInputElement>(
      nativeElement,
      "input[formControlName='confirmPassword']",
    );
    const form = requireElement<HTMLFormElement>(nativeElement, "form");
    type(newPasswordInput, "brand-new1");
    type(confirmPasswordInput, "brand-new1");
    form.dispatchEvent(new Event("submit"));
    return { newPasswordInput, confirmPasswordInput, form };
  }

  it("strips the token from the visible URL on load", () => {
    const originalReplaceState = window.history.replaceState;
    const replaceStateSpy = vi.fn();
    window.history.replaceState = replaceStateSpy;
    try {
      setup("raw-reset-token");
      expect(replaceStateSpy).toHaveBeenCalled();
      const url = new URL(replaceStateSpy.mock.calls[0][2] as string, window.location.href);
      expect(url.searchParams.has("token")).toBe(false);
    } finally {
      window.history.replaceState = originalReplaceState;
    }
  });

  it("shows the incomplete-link state and no form when there is no token", () => {
    const { nativeElement } = setup(null);

    expect(nativeElement.textContent).toContain("incomplete");
    expect(nativeElement.querySelector("form")).toBeNull();
  });

  it("submits the token and new password, then shows the success card", () => {
    const { fixture, nativeElement } = setup("raw-reset-token");

    fillValidFormAndSubmit(nativeElement);
    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/reset-password"));
    expect(req.request.body).toEqual({ token: "raw-reset-token", newPassword: "brand-new1" });
    req.flush(null, { status: 204, statusText: "No Content" });
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Password changed");
    expect(nativeElement.querySelector("form")).toBeNull();
  });

  it("shows the invalid-link state with a request-again action on a 400", () => {
    const { fixture, nativeElement } = setup();

    fillValidFormAndSubmit(nativeElement);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/reset-password"))
      .flush({ status: 400, title: "Bad Request" }, { status: 400, statusText: "Bad Request" });
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("no longer valid");
    const link = requireElement<HTMLAnchorElement>(nativeElement, "a[href='/forgot-password']");
    expect(link).toBeTruthy();
  });

  it("shows a distinct message on rate limiting", () => {
    const { fixture, nativeElement } = setup();

    fillValidFormAndSubmit(nativeElement);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/reset-password"))
      .flush({ status: 429, title: "Too many requests" }, { status: 429, statusText: "Too Many Requests" });
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Too many attempts");
  });

  it("shows the cold-start message only once the request has run past the threshold", () => {
    vi.useFakeTimers();
    try {
      const { fixture, nativeElement } = setup("raw-reset-token");

      fillValidFormAndSubmit(nativeElement);
      fixture.detectChanges();
      expect(nativeElement.textContent).not.toContain("waking up");

      vi.advanceTimersByTime(5000);
      fixture.detectChanges();
      expect(nativeElement.textContent).toContain("waking up");

      httpMock
        .expectOne((r) => r.url.endsWith("/api/v1/auth/reset-password"))
        .flush(null, { status: 204, statusText: "No Content" });
      fixture.detectChanges();
      expect(nativeElement.textContent).not.toContain("waking up");
    } finally {
      vi.useRealTimers();
    }
  });

  it("never shows the cold-start message for a fast response", () => {
    vi.useFakeTimers();
    try {
      const { fixture, nativeElement } = setup("raw-reset-token");

      fillValidFormAndSubmit(nativeElement);
      httpMock
        .expectOne((r) => r.url.endsWith("/api/v1/auth/reset-password"))
        .flush(null, { status: 204, statusText: "No Content" });
      fixture.detectChanges();

      vi.advanceTimersByTime(10000);
      fixture.detectChanges();
      expect(nativeElement.textContent).not.toContain("waking up");
    } finally {
      vi.useRealTimers();
    }
  });

  it("blocks submission and shows an inline error for a password shorter than 8 characters", () => {
    const { fixture, nativeElement } = setup();
    const newPasswordInput = requireElement<HTMLInputElement>(
      nativeElement,
      "input[formControlName='newPassword']",
    );
    const confirmPasswordInput = requireElement<HTMLInputElement>(
      nativeElement,
      "input[formControlName='confirmPassword']",
    );
    const form = requireElement<HTMLFormElement>(nativeElement, "form");

    type(newPasswordInput, "short1");
    type(confirmPasswordInput, "short1");
    form.dispatchEvent(new Event("submit"));
    fixture.detectChanges();

    expect(newPasswordInput.getAttribute("aria-invalid")).toBe("true");
    // httpMock.verify() in afterEach asserts no request went out.
  });

  it("reports a blank confirmation as unconfirmed, not as a mismatch", () => {
    const { fixture, nativeElement } = setup();
    const newPasswordInput = requireElement<HTMLInputElement>(
      nativeElement,
      "input[formControlName='newPassword']",
    );
    const form = requireElement<HTMLFormElement>(nativeElement, "form");

    type(newPasswordInput, "brand-new1");
    form.dispatchEvent(new Event("submit"));
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Confirm your new password.");
    expect(nativeElement.textContent).not.toContain("Passwords do not match.");
  });

  it("reports a filled but different confirmation as a mismatch", () => {
    const { fixture, nativeElement } = setup();
    const newPasswordInput = requireElement<HTMLInputElement>(
      nativeElement,
      "input[formControlName='newPassword']",
    );
    const confirmPasswordInput = requireElement<HTMLInputElement>(
      nativeElement,
      "input[formControlName='confirmPassword']",
    );
    const form = requireElement<HTMLFormElement>(nativeElement, "form");

    type(newPasswordInput, "brand-new1");
    type(confirmPasswordInput, "different-horse2");
    form.dispatchEvent(new Event("submit"));
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Passwords do not match.");
  });
});
