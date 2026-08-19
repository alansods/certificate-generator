import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { SessionService } from "../core/auth/session.service";
import { ShellComponent } from "./shell.component";

const USER = { id: 1, email: "marina@escola.br", fullName: "Marina Ribeiro", role: "ADMIN" } as const;

describe("ShellComponent", () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: "certificates", children: [] },
          { path: "verify-code", children: [] },
        ]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function setup() {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    return { fixture, nativeElement: fixture.nativeElement as HTMLElement };
  }

  function flushMe(body: object | null, status = 200) {
    const request = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/me"));
    if (status === 200) {
      request.flush(body);
    } else {
      request.flush(null, { status, statusText: "Internal Server Error" });
    }
  }

  it("renders a navigation item for every authenticated area", () => {
    const { nativeElement } = setup();
    flushMe(USER);

    const links = [...nativeElement.querySelectorAll("nav a")].map((a) => a.getAttribute("href"));

    expect(links).toContain("/certificates");
    expect(links).toContain("/verify-code");
  });

  it("links the brand back to the certificate list", () => {
    const { nativeElement } = setup();
    flushMe(USER);

    const brand = nativeElement.querySelector("header a");

    expect(brand?.getAttribute("href")).toBe("/certificates");
  });

  it("shows the signed-in user's name, role and initials", () => {
    const { fixture, nativeElement } = setup();
    flushMe(USER);
    fixture.detectChanges();

    const text = nativeElement.textContent ?? "";

    expect(text).toContain("Marina Ribeiro");
    expect(text).toContain("ADMIN");
    expect(text).toContain("MR");
  });

  it("requests the current user exactly once", () => {
    const { fixture } = setup();
    flushMe(USER);
    fixture.detectChanges();
    // A second detectChanges must not trigger another lookup; httpMock.verify() would fail.
    fixture.detectChanges();
  });

  it("still renders the navigation and sign-out when the user lookup fails", () => {
    const { fixture, nativeElement } = setup();
    flushMe(null, 500);
    fixture.detectChanges();

    expect(nativeElement.querySelectorAll("nav a").length).toBeGreaterThan(0);
    expect(nativeElement.textContent).toContain("Signed in");

    const signOut = [...nativeElement.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Sign out",
    );

    expect(signOut).toBeDefined();
  });

  it("signs out through the session service", () => {
    const { fixture, nativeElement } = setup();
    flushMe(USER);
    fixture.detectChanges();
    const signOutSpy = vi.spyOn(TestBed.inject(SessionService), "signOut").mockImplementation(() => undefined);

    const signOut = [...nativeElement.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Sign out",
    );
    signOut?.click();

    expect(signOutSpy).toHaveBeenCalled();
  });

  it("hands a code from the top bar to the in-app lookup without the user retyping it", () => {
    const { fixture, nativeElement } = setup();
    flushMe(USER);
    fixture.detectChanges();
    const navigateSpy = vi.spyOn(TestBed.inject(Router), "navigate");

    const input = nativeElement.querySelector<HTMLInputElement>("header input");
    if (!input) {
      throw new Error("Expected the quick-verify field in the top bar");
    }
    input.value = "cert-7k2m-9xq4";
    input.dispatchEvent(new Event("input"));
    nativeElement.querySelector<HTMLFormElement>("header form")?.requestSubmit();

    expect(navigateSpy).toHaveBeenCalledWith(["/verify-code"], {
      queryParams: { code: "CERT-7K2M-9XQ4" },
    });
  });

  it("does not navigate when the quick-verify field is empty", () => {
    const { fixture, nativeElement } = setup();
    flushMe(USER);
    fixture.detectChanges();
    const navigateSpy = vi.spyOn(TestBed.inject(Router), "navigate");

    nativeElement.querySelector<HTMLFormElement>("header form")?.requestSubmit();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("announces the current area rather than signalling it by color alone", async () => {
    const { fixture, nativeElement } = setup();
    flushMe(USER);
    await TestBed.inject(Router).navigateByUrl("/verify-code");
    fixture.detectChanges();

    const current = [...nativeElement.querySelectorAll("nav a[aria-current='page']")];

    expect(current).toHaveLength(1);
    expect(current[0]?.getAttribute("href")).toBe("/verify-code");
  });

  it("empties the quick-verify field once a code has been handed over", async () => {
    const { fixture, nativeElement } = setup();
    flushMe(USER);
    fixture.detectChanges();

    const input = nativeElement.querySelector<HTMLInputElement>("header input");
    if (!input) {
      throw new Error("Expected the quick-verify field in the top bar");
    }
    input.value = "CERT-7K2M-9XQ4";
    input.dispatchEvent(new Event("input"));
    nativeElement.querySelector<HTMLFormElement>("header form")?.requestSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(input.value).toBe("");
  });

  it("gives the chrome its landmarks and names the quick-verify field", () => {
    const { nativeElement } = setup();
    flushMe(USER);

    expect(nativeElement.querySelector("header")).not.toBeNull();
    expect(nativeElement.querySelector("main")).not.toBeNull();
    expect(nativeElement.querySelector("nav")?.getAttribute("aria-label")).toBe("Main");
    expect(nativeElement.querySelector("label span.sr-only")?.textContent?.trim()).toBe(
      "Verify a certificate code",
    );
  });

  it("keeps sign-out inside the navigation on the narrow layout", () => {
    const { nativeElement } = setup();
    flushMe(USER);

    // The narrow layout is Tailwind variants, so this asserts the markup that produces it: a
    // sign-out control inside the nav that is hidden from the medium breakpoint up.
    const navSignOut = [...(nativeElement.querySelectorAll("nav button") ?? [])].find(
      (button) => button.textContent?.trim() === "Sign out" && button.className.includes("md:hidden"),
    );

    expect(navSignOut).toBeDefined();
  });
});
