import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { TokenStorageService } from "./token-storage.service";
import { TokenRefreshService } from "./token-refresh.service";

describe("TokenRefreshService", () => {
  let httpMock: HttpTestingController;
  let service: TokenRefreshService;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(TokenRefreshService);
    tokenStorage = TestBed.inject(TokenStorageService);
    tokenStorage.setTokens("stale-access", "refresh-1");
  });

  afterEach(() => httpMock.verify());

  it("shares one HTTP call across two independent callers refreshing at the same time", () => {
    // Simulates the exact scenario the coordinator exists for: the 401-retry interceptor and the
    // auth guard both needing a fresh token around the same moment, without either presenting the
    // same (about-to-be-revoked) refresh token twice.
    const results: string[] = [];
    service.refresh().subscribe((token) => results.push(token));
    service.refresh().subscribe((token) => results.push(token));

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/auth/refresh"))
      .flush({ accessToken: "access-new", refreshToken: "refresh-new", expiresIn: 900 });

    expect(results).toEqual(["access-new", "access-new"]);
    expect(tokenStorage.accessToken()).toBe("access-new");
  });
});
