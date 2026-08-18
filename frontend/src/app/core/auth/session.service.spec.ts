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
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
});
