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
});
