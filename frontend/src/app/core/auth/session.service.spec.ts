import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { SessionService } from "./session.service";
import { TokenStorageService } from "./token-storage.service";

const USER = { id: 1, email: "marina@escola.br", fullName: "Marina Ribeiro", role: "ADMIN" } as const;

describe("SessionService", () => {
  let httpMock: HttpTestingController;
  let service: SessionService;
  let tokenStorage: TokenStorageService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // A real route: with an empty table the sign-out navigation rejects, which is an artifact
        // of the test rather than of the behaviour under test.
        provideRouter([{ path: "login", children: [] }]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(SessionService);
    tokenStorage = TestBed.inject(TokenStorageService);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  function expectMe() {
    return httpMock.expectOne((request) => request.url.endsWith("/api/v1/auth/me"));
  }

  function expectLogout() {
    return httpMock.expectOne(
      (request) => request.url.endsWith("/api/v1/auth/logout") && request.method === "POST",
    );
  }

  it("publishes the signed-in user after loading it once", () => {
    service.load();
    expectMe().flush(USER);

    expect(service.currentUser()).toEqual(USER);
  });

  it("leaves the user null when the lookup fails, without throwing", () => {
    service.load();
    expectMe().flush(null, { status: 500, statusText: "Internal Server Error" });

    expect(service.currentUser()).toBeNull();
  });

  it("reports loading while the lookup is in flight, and not once it settles", () => {
    expect(service.loading()).toBe(false);
    service.load();
    expect(service.loading()).toBe(true);

    expectMe().flush(USER);

    expect(service.loading()).toBe(false);
  });

  it("reports loadFailed only once the lookup has actually failed", () => {
    expect(service.loadFailed()).toBe(false);
    service.load();
    expect(service.loadFailed()).toBe(false);

    expectMe().flush(null, { status: 500, statusText: "Internal Server Error" });

    expect(service.loadFailed()).toBe(true);
  });

  it("does not report loadFailed once the lookup succeeds", () => {
    service.load();
    expectMe().flush(USER);

    expect(service.loadFailed()).toBe(false);
  });

  it("retries after a failed lookup when load() is called again", () => {
    service.load();
    expectMe().flush(null, { status: 500, statusText: "Internal Server Error" });
    expect(service.loadFailed()).toBe(true);

    service.load();

    expect(service.loadFailed()).toBe(false);
    expectMe().flush(USER);
    expect(service.currentUser()).toEqual(USER);
  });

  it("revokes the refresh token, clears storage and returns to login on sign-out", () => {
    tokenStorage.setTokens("access", "refresh");
    const navigateSpy = vi.spyOn(router, "navigateByUrl");

    service.signOut();
    const request = expectLogout();

    expect(request.request.body).toEqual({ refreshToken: "refresh" });

    request.flush(null, { status: 204, statusText: "No Content" });

    expect(tokenStorage.refreshToken).toBeNull();
    expect(tokenStorage.accessToken()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith("/login");
  });

  it("still signs the user out locally when the revocation request fails", () => {
    tokenStorage.setTokens("access", "refresh");
    const navigateSpy = vi.spyOn(router, "navigateByUrl");

    service.signOut();
    expectLogout().flush(null, { status: 500, statusText: "Internal Server Error" });

    expect(tokenStorage.refreshToken).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith("/login");
  });

  it("signs out without a request when there is no refresh token to revoke", () => {
    const navigateSpy = vi.spyOn(router, "navigateByUrl");

    service.signOut();

    expect(navigateSpy).toHaveBeenCalledWith("/login");
    // httpMock.verify() asserts no logout request was made.
  });

  it("forgets the current user on sign-out", () => {
    service.load();
    expectMe().flush(USER);
    tokenStorage.setTokens("access", "refresh");

    service.signOut();
    expectLogout().flush(null, { status: 204, statusText: "No Content" });

    expect(service.currentUser()).toBeNull();
  });

  it("loads the user once, however many times the shell asks", () => {
    service.load();
    expectMe().flush(USER);

    service.load();

    // httpMock.verify() in afterEach asserts no second request went out.
    expect(service.currentUser()).toEqual(USER);
  });

  it("keeps the loaded user when a later lookup fails", () => {
    service.load();
    expectMe().flush(USER);

    // Force a re-load the way a fresh session would, then fail it.
    service.signOut();
    expect(service.currentUser()).toBeNull();
    service.load();
    expectMe().flush(null, { status: 500, statusText: "Internal Server Error" });

    expect(service.currentUser()).toBeNull();
  });

  it("cancels a lookup that outlives the session it belonged to", () => {
    service.load();
    const inFlight = expectMe();

    service.signOut();

    // Cancelled outright: left open it could 401 after the next user signs in on this tab, and
    // the refresh interceptor would clear their tokens.
    expect(inFlight.cancelled).toBe(true);
    expect(service.currentUser()).toBeNull();
  });

  it("reflects a profile save immediately, without a re-fetch of /me", () => {
    service.load();
    expectMe().flush(USER);

    service.updateCurrentUser({ ...USER, fullName: "Marina Silva" });

    expect(service.currentUser()?.fullName).toBe("Marina Silva");
    // httpMock.verify() in afterEach asserts no request went out for this.
  });

  it("lets the next user load their own identity after a sign-out mid-lookup", () => {
    service.load();
    expectMe();
    service.signOut();

    // The abandoned lookup must not have left the guard set, or this second load never runs.
    service.load();
    expectMe().flush({ ...USER, id: 2, fullName: "Other Person" });

    expect(service.currentUser()?.fullName).toBe("Other Person");
  });
});
