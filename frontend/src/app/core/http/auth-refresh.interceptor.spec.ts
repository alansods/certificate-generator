import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { TokenStorageService } from "../auth/token-storage.service";
import { authRefreshInterceptor } from "./auth-refresh.interceptor";

describe("authRefreshInterceptor", () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let tokenStorage: TokenStorageService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authRefreshInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    tokenStorage = TestBed.inject(TokenStorageService);
    router = TestBed.inject(Router);
    tokenStorage.setTokens("expired-access", "refresh-1");
  });

  afterEach(() => httpMock.verify());

  it("refreshes once and retries the original request on a single 401", () => {
    let result: unknown;
    http.get("/api/v1/certificates").subscribe((response) => (result = response));

    httpMock.expectOne("/api/v1/certificates").flush(null, { status: 401, statusText: "Unauthorized" });

    const refreshReq = httpMock.expectOne((req) => req.url.endsWith("/api/v1/auth/refresh"));
    refreshReq.flush({ accessToken: "new-access", refreshToken: "new-refresh", expiresIn: 900 });

    const retried = httpMock.expectOne("/api/v1/certificates");
    expect(retried.request.headers.get("Authorization")).toBe("Bearer new-access");
    retried.flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(tokenStorage.accessToken()).toBe("new-access");
    expect(tokenStorage.refreshToken).toBe("new-refresh");
  });

  it("deduplicates concurrent 401s into a single refresh call", () => {
    const results: unknown[] = [];
    http.get("/api/v1/certificates").subscribe((r) => results.push(r));
    http.get("/api/v1/certificates/1").subscribe((r) => results.push(r));

    httpMock.expectOne("/api/v1/certificates").flush(null, { status: 401, statusText: "Unauthorized" });
    httpMock.expectOne("/api/v1/certificates/1").flush(null, { status: 401, statusText: "Unauthorized" });

    // Exactly one refresh call in flight for both failures.
    const refreshReq = httpMock.expectOne((req) => req.url.endsWith("/api/v1/auth/refresh"));
    refreshReq.flush({ accessToken: "new-access", refreshToken: "new-refresh", expiresIn: 900 });

    httpMock.expectOne("/api/v1/certificates").flush({ list: true });
    httpMock.expectOne("/api/v1/certificates/1").flush({ one: true });

    expect(results).toEqual([{ list: true }, { one: true }]);
  });

  it("clears tokens and navigates to /login when the refresh call itself fails", () => {
    const navigateSpy = vi.spyOn(router, "navigateByUrl");
    let caught: unknown;
    http.get("/api/v1/certificates").subscribe({ error: (e) => (caught = e) });

    httpMock.expectOne("/api/v1/certificates").flush(null, { status: 401, statusText: "Unauthorized" });
    httpMock
      .expectOne((req) => req.url.endsWith("/api/v1/auth/refresh"))
      .flush(null, { status: 401, statusText: "Unauthorized" });

    expect(tokenStorage.accessToken()).toBeNull();
    expect(tokenStorage.refreshToken).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith("/login");
    expect(caught).toBeInstanceOf(HttpErrorResponse);
  });

  it("does not attempt a refresh on 403", () => {
    let caught: unknown;
    http.delete("/api/v1/certificates/1").subscribe({ error: (e) => (caught = e) });

    httpMock.expectOne("/api/v1/certificates/1").flush(null, { status: 403, statusText: "Forbidden" });

    httpMock.verify();
    expect(caught).toBeInstanceOf(HttpErrorResponse);
    expect((caught as HttpErrorResponse).status).toBe(403);
  });
});
