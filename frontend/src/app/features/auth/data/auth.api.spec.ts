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

  it("register stores the returned tokens", () => {
    let completed = false;
    api.register("Jane Doe", "jane@example.com", "correct-horse1").subscribe(() => (completed = true));

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/register"));
    expect(req.request.body).toEqual({
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "correct-horse1",
    });
    req.flush({ accessToken: "access-1", refreshToken: "refresh-1", expiresIn: 900 });

    expect(completed).toBe(true);
    expect(tokenStorage.accessToken()).toBe("access-1");
    expect(tokenStorage.refreshToken).toBe("refresh-1");
  });

  it("registrationEnabled reports the flag from the response body", () => {
    let result: boolean | undefined;
    api.registrationEnabled().subscribe((enabled) => (result = enabled));

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/registration-enabled"));
    req.flush({ enabled: false });

    expect(result).toBe(false);
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

  it("updateProfile PUTs the new name and email", () => {
    let result: unknown;
    api.updateProfile("Jane Doe", "jane@example.com").subscribe((response) => (result = response));

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/me") && r.method === "PUT");
    expect(req.request.body).toEqual({ fullName: "Jane Doe", email: "jane@example.com" });
    req.flush({ id: 1, fullName: "Jane Doe", email: "jane@example.com", role: "USER" });

    expect(result).toEqual({ id: 1, fullName: "Jane Doe", email: "jane@example.com", role: "USER" });
  });

  it("changePassword sends the stored refresh token alongside the new password", () => {
    tokenStorage.setTokens("access-1", "refresh-1");

    api.changePassword("old-pw1", "new-pw1").subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/me/password"));
    expect(req.request.body).toEqual({
      currentPassword: "old-pw1",
      newPassword: "new-pw1",
      refreshToken: "refresh-1",
    });
    req.flush(null, { status: 204, statusText: "No Content" });
  });

  it("forgotPassword posts the email", () => {
    let completed = false;
    api.forgotPassword("jane@example.com").subscribe(() => (completed = true));

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/forgot-password"));
    expect(req.request.body).toEqual({ email: "jane@example.com" });
    req.flush(null, { status: 202, statusText: "Accepted" });

    expect(completed).toBe(true);
  });

  it("resetPassword posts the token and the new password", () => {
    api.resetPassword("raw-token", "brand-new1").subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith("/api/v1/auth/reset-password"));
    expect(req.request.body).toEqual({ token: "raw-token", newPassword: "brand-new1" });
    req.flush(null, { status: 204, statusText: "No Content" });
  });
});
