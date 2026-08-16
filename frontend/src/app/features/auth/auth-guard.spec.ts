import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from "@angular/router";
import { firstValueFrom, isObservable } from "rxjs";
import { TokenStorageService } from "../../core/auth/token-storage.service";
import { authGuard } from "./auth-guard";

const FAKE_ROUTE = {} as unknown as ActivatedRouteSnapshot;
const FAKE_STATE = {} as unknown as RouterStateSnapshot;

describe("authGuard", () => {
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  async function resolveGuard() {
    const result = TestBed.runInInjectionContext(() => authGuard(FAKE_ROUTE, FAKE_STATE));
    return isObservable(result) ? firstValueFrom(result) : result;
  }

  it("redirects to /login without any HTTP call when there is no session at all", async () => {
    const result = await resolveGuard();

    expect(result?.toString()).toBe(router.createUrlTree(["/login"]).toString());
  });

  it("allows navigation when an access token is present", async () => {
    tokenStorage.setTokens("access-1", "refresh-1");

    expect(await resolveGuard()).toBe(true);
  });

  it("silently refreshes and allows navigation when only a refresh token survives a reload", async () => {
    localStorage.setItem("certificate-generator.refreshToken", "refresh-1");

    const resultPromise = resolveGuard();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/refresh"))
      .flush({ accessToken: "access-2", refreshToken: "refresh-2", expiresIn: 900 });

    expect(await resultPromise).toBe(true);
    expect(tokenStorage.accessToken()).toBe("access-2");
  });

  it("clears tokens and redirects to /login when the refresh fails", async () => {
    localStorage.setItem("certificate-generator.refreshToken", "refresh-1");

    const resultPromise = resolveGuard();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/refresh"))
      .flush(null, { status: 401, statusText: "Unauthorized" });

    const result = await resultPromise;
    expect(result?.toString()).toBe(router.createUrlTree(["/login"]).toString());
    expect(tokenStorage.accessToken()).toBeNull();
    expect(tokenStorage.refreshToken).toBeNull();
  });
});
