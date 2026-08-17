import { TestBed } from "@angular/core/testing";
import { TokenStorageService } from "./token-storage.service";

describe("TokenStorageService", () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it("stores the access token in memory and the refresh token in localStorage", () => {
    const service = TestBed.inject(TokenStorageService);

    service.setTokens("access-1", "refresh-1");

    expect(service.accessToken()).toBe("access-1");
    expect(service.refreshToken).toBe("refresh-1");
    expect(localStorage.getItem("certificate-generator.refreshToken")).toBe("refresh-1");
  });

  it("does not persist the access token across a fresh service instance", () => {
    const first = TestBed.inject(TokenStorageService);
    first.setTokens("access-1", "refresh-1");

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const second = TestBed.inject(TokenStorageService);

    expect(second.accessToken()).toBeNull();
    expect(second.refreshToken).toBe("refresh-1");
  });

  it("clears both tokens", () => {
    const service = TestBed.inject(TokenStorageService);
    service.setTokens("access-1", "refresh-1");

    service.clear();

    expect(service.accessToken()).toBeNull();
    expect(service.refreshToken).toBeNull();
  });

  it("decodes the role claim from the access token", () => {
    const service = TestBed.inject(TokenStorageService);

    service.setTokens(fakeJwt({ role: "ADMIN" }), "refresh-1");

    expect(service.role()).toBe("ADMIN");
  });

  it("role is null when there is no access token", () => {
    const service = TestBed.inject(TokenStorageService);

    expect(service.role()).toBeNull();
  });

  it("role is null for a malformed token instead of throwing", () => {
    const service = TestBed.inject(TokenStorageService);

    service.setTokens("not-a-real-jwt", "refresh-1");

    expect(service.role()).toBeNull();
  });
});

function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (value: string) =>
    btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}
