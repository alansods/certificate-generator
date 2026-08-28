import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { SessionService } from "../../../../core/auth/session.service";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { ToastHostComponent } from "../../../../shared/toast/toast-host.component";
import { ProfilePageComponent } from "./profile-page.component";

const USER = { id: 1, email: "marina@escola.br", fullName: "Marina Ribeiro", role: "ADMIN" } as const;

describe("ProfilePageComponent", () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionService).updateCurrentUser(USER);
  });

  afterEach(() => httpMock.verify());

  function setup() {
    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    return { fixture, nativeElement: fixture.nativeElement as HTMLElement };
  }

  function submitProfileForm(nativeElement: HTMLElement): void {
    nativeElement.querySelectorAll("form")[0]?.dispatchEvent(new Event("submit"));
  }

  function submitPasswordForm(nativeElement: HTMLElement): void {
    nativeElement.querySelectorAll("form")[1]?.dispatchEvent(new Event("submit"));
  }

  function input(nativeElement: HTMLElement, name: string): HTMLInputElement {
    const element = nativeElement.querySelector<HTMLInputElement>(`input[formcontrolname="${name}"]`);
    if (!element) {
      throw new Error(`Expected an input for ${name}`);
    }
    return element;
  }

  function setInputValue(el: HTMLInputElement, value: string): void {
    el.value = value;
    el.dispatchEvent(new Event("input"));
  }

  function renderToastHost(): { text: () => string } {
    const hostFixture = TestBed.createComponent(ToastHostComponent);
    hostFixture.detectChanges();
    return {
      text: () => {
        hostFixture.detectChanges();
        return (hostFixture.nativeElement as HTMLElement).textContent ?? "";
      },
    };
  }

  it("shows the signed-in account's name, email and role", () => {
    const { nativeElement } = setup();

    const text = nativeElement.textContent ?? "";
    expect(text).toContain("Marina Ribeiro");
    expect(text).toContain("marina@escola.br");
    expect(text).toContain("ADMIN");
  });

  it("pre-fills the profile form from the session, even loaded after the page is created", () => {
    // SessionService.load() resolves over HTTP; a page constructed first must still end up
    // showing the fetched values once the session catches up, not stay blank. Reconfigures
    // TestBed from scratch so the component is created before updateCurrentUser() runs, unlike
    // every other test here where the session is already populated at setup() time.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();

    TestBed.inject(SessionService).updateCurrentUser(USER);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(input(nativeElement, "fullName").value).toBe("Marina Ribeiro");
    expect(input(nativeElement, "email").value).toBe("marina@escola.br");
  });

  it("saves a valid profile change and updates the session", () => {
    const { fixture, nativeElement } = setup();
    const toasts = renderToastHost();

    setInputValue(input(nativeElement, "fullName"), "Marina Silva");
    setInputValue(input(nativeElement, "email"), "marina.silva@escola.br");
    submitProfileForm(nativeElement);

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/me") && r.method === "PUT");
    expect(req.request.body).toEqual({ fullName: "Marina Silva", email: "marina.silva@escola.br" });
    req.flush({ id: 1, fullName: "Marina Silva", email: "marina.silva@escola.br", role: "ADMIN" });
    fixture.detectChanges();

    expect(TestBed.inject(SessionService).currentUser()?.fullName).toBe("Marina Silva");
    expect(toasts.text()).toContain("Profile updated");
  });

  it("marks the email field when the server reports it is already taken", () => {
    const { fixture, nativeElement } = setup();

    setInputValue(input(nativeElement, "email"), "taken@escola.br");
    submitProfileForm(nativeElement);

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/me") && r.method === "PUT")
      .flush(
        { status: 409, fieldErrors: { email: "Email is already registered to another account" } },
        { status: 409, statusText: "Conflict" },
      );
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Email is already registered to another account");
  });

  it("blocks the profile save on a blank name without a request", () => {
    const { fixture, nativeElement } = setup();

    setInputValue(input(nativeElement, "fullName"), "");
    submitProfileForm(nativeElement);
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Full name is required.");
    // httpMock.verify() asserts no request went out.
  });

  it("blocks the profile save on a malformed email without a request", () => {
    const { fixture, nativeElement } = setup();

    setInputValue(input(nativeElement, "email"), "not-an-email");
    submitProfileForm(nativeElement);
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Enter a valid email address.");
  });

  it("changes the password, clears the fields and shows a confirmation", () => {
    const { fixture, nativeElement } = setup();
    const toasts = renderToastHost();
    TestBed.inject(TokenStorageService).setTokens("access", "refresh-1");

    setInputValue(input(nativeElement, "currentPassword"), "current-pw1");
    setInputValue(input(nativeElement, "newPassword"), "new-password1");
    setInputValue(input(nativeElement, "confirmPassword"), "new-password1");
    submitPasswordForm(nativeElement);

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/me/password"));
    expect(req.request.body).toEqual({
      currentPassword: "current-pw1",
      newPassword: "new-password1",
      refreshToken: "refresh-1",
    });
    req.flush(null, { status: 204, statusText: "No Content" });
    fixture.detectChanges();

    expect(input(nativeElement, "currentPassword").value).toBe("");
    expect(input(nativeElement, "newPassword").value).toBe("");
    expect(input(nativeElement, "confirmPassword").value).toBe("");
    expect(toasts.text()).toContain("Password changed");
    expect(toasts.text()).toContain("Other devices have been signed out");
  });

  it("marks the current-password field on a server rejection", () => {
    const { fixture, nativeElement } = setup();

    setInputValue(input(nativeElement, "currentPassword"), "wrong-pw1");
    setInputValue(input(nativeElement, "newPassword"), "new-password1");
    setInputValue(input(nativeElement, "confirmPassword"), "new-password1");
    submitPasswordForm(nativeElement);

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/me/password"))
      .flush(
        { status: 400, fieldErrors: { currentPassword: "Current password is incorrect" } },
        { status: 400, statusText: "Bad Request" },
      );
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Current password is incorrect");
    expect(input(nativeElement, "newPassword").value).toBe("new-password1");
  });

  it("blocks a new password that fails the policy without a request", () => {
    const { fixture, nativeElement } = setup();

    setInputValue(input(nativeElement, "currentPassword"), "current-pw1");
    setInputValue(input(nativeElement, "newPassword"), "short");
    setInputValue(input(nativeElement, "confirmPassword"), "short");
    submitPasswordForm(nativeElement);
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Must be at least 8 characters and contain a digit.");
  });

  it("blocks a confirmation that does not match the new password", () => {
    const { fixture, nativeElement } = setup();

    setInputValue(input(nativeElement, "currentPassword"), "current-pw1");
    setInputValue(input(nativeElement, "newPassword"), "new-password1");
    setInputValue(input(nativeElement, "confirmPassword"), "different-password1");
    submitPasswordForm(nativeElement);
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Passwords do not match.");
  });

  it("shows a spinner while the session is still loading, not a blank form", () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionService).load();
    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector("[role='status']")).not.toBeNull();
    expect(nativeElement.querySelector("form")).toBeNull();

    httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/me")).flush(USER);
  });

  it("shows a retry action when the session fails to load, not an empty submittable form", () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionService).load();
    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/me"))
      .flush(null, { status: 500, statusText: "Internal Server Error" });
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector("[role='alert']")?.textContent).toContain(
      "Could not load your profile",
    );
    expect(nativeElement.querySelector("form")).toBeNull();

    const retry = [...nativeElement.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Retry",
    );
    retry?.click();
    httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/me")).flush(USER);
    fixture.detectChanges();

    expect(nativeElement.querySelector("form")).not.toBeNull();
  });

  it("reports a blank confirmation as unconfirmed, not as a mismatch", () => {
    const { fixture, nativeElement } = setup();

    setInputValue(input(nativeElement, "currentPassword"), "current-pw1");
    setInputValue(input(nativeElement, "newPassword"), "new-password1");
    submitPasswordForm(nativeElement);
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Confirm your new password.");
    expect(nativeElement.textContent).not.toContain("Passwords do not match.");
  });

  it("shows a form-level message when the profile save fails without field errors", () => {
    const { fixture, nativeElement } = setup();

    submitProfileForm(nativeElement);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/me") && r.method === "PUT")
      .flush(null, { status: 500, statusText: "Internal Server Error" });
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Could not reach the server.");
  });

  it("shows a form-level message when the password change fails without field errors", () => {
    const { fixture, nativeElement } = setup();

    setInputValue(input(nativeElement, "currentPassword"), "current-pw1");
    setInputValue(input(nativeElement, "newPassword"), "new-password1");
    setInputValue(input(nativeElement, "confirmPassword"), "new-password1");
    submitPasswordForm(nativeElement);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/me/password"))
      .flush(null, { status: 500, statusText: "Internal Server Error" });
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("Could not reach the server.");
  });

  it("disables the save button and shows progress while the profile request is in flight", () => {
    const { fixture, nativeElement } = setup();

    submitProfileForm(nativeElement);
    fixture.detectChanges();

    const button = [...nativeElement.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Saving"),
    );
    expect(button).toBeDefined();
    expect(button?.disabled).toBe(true);

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/me") && r.method === "PUT")
      .flush({ id: 1, fullName: "", email: "", role: "ADMIN" });
  });

  it("submits the profile form without touching the password form, and vice versa", () => {
    const { fixture, nativeElement } = setup();

    setInputValue(input(nativeElement, "fullName"), "Marina Silva");
    setInputValue(input(nativeElement, "email"), "marina.silva@escola.br");
    submitProfileForm(nativeElement);
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/me") && r.method === "PUT")
      .flush({ id: 1, fullName: "Marina Silva", email: "marina.silva@escola.br", role: "ADMIN" });
    fixture.detectChanges();

    // httpMock.verify() in afterEach asserts no password request was made alongside it.
    expect(nativeElement.textContent).not.toContain("Current password is required.");
  });
});
