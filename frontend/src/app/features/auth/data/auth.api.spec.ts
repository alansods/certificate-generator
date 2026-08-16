import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { TokenStorageService } from "../../../core/auth/token-storage.service";
import { AuthApi } from "./auth.api";

describe("AuthApi", () => {
  let httpMock: HttpTestingController;
  let api: AuthApi;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    api = TestBed.inject(AuthApi);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => httpMock.verify());

  it("login stores the returned tokens", () => {
    let completed = false;
    api.login("jane@example.com", "secret").subscribe(() => (completed = true));

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/login"));
    expect(req.request.body).toEqual({ email: "jane@example.com", password: "secret" });
    req.flush({ accessToken: "access-1", refreshToken: "refresh-1", expiresIn: 900 });

    expect(completed).toBe(true);
    expect(tokenStorage.accessToken()).toBe("access-1");
    expect(tokenStorage.refreshToken).toBe("refresh-1");
  });

  it("refresh sends the stored refresh token and stores the new pair", () => {
    tokenStorage.setTokens("stale-access", "refresh-1");

    api.refresh().subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/refresh"));
    expect(req.request.body).toEqual({ refreshToken: "refresh-1" });
    req.flush({ accessToken: "access-2", refreshToken: "refresh-2", expiresIn: 900 });

    expect(tokenStorage.accessToken()).toBe("access-2");
    expect(tokenStorage.refreshToken).toBe("refresh-2");
  });
});
