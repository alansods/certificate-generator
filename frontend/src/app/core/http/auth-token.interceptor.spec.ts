import { HttpClient, provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { TokenStorageService } from "../auth/token-storage.service";
import { authTokenInterceptor } from "./auth-token.interceptor";

describe("authTokenInterceptor", () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => httpMock.verify());

  it("attaches the bearer token to a protected request", () => {
    tokenStorage.setTokens("access-1", "refresh-1");

    http.get("/api/v1/certificates").subscribe();

    const req = httpMock.expectOne("/api/v1/certificates");
    expect(req.request.headers.get("Authorization")).toBe("Bearer access-1");
    req.flush({});
  });

  it("omits the header for the login endpoint", () => {
    tokenStorage.setTokens("access-1", "refresh-1");

    http.post("/api/v1/auth/login", {}).subscribe();

    const req = httpMock.expectOne("/api/v1/auth/login");
    expect(req.request.headers.has("Authorization")).toBe(false);
    req.flush({});
  });

  it("omits the header for the public verification endpoint", () => {
    tokenStorage.setTokens("access-1", "refresh-1");

    http.get("/api/v1/public/verify/CERT-AAAA-BBBB").subscribe();

    const req = httpMock.expectOne("/api/v1/public/verify/CERT-AAAA-BBBB");
    expect(req.request.headers.has("Authorization")).toBe(false);
    req.flush({});
  });

  it("omits the header when no access token is stored", () => {
    http.get("/api/v1/certificates").subscribe();

    const req = httpMock.expectOne("/api/v1/certificates");
    expect(req.request.headers.has("Authorization")).toBe(false);
    req.flush({});
  });
});
