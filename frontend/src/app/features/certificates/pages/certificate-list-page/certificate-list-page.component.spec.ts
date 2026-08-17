import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { of } from "rxjs";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { CertificateListPageComponent } from "./certificate-list-page.component";

function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (value: string) =>
    btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${base64url(JSON.stringify({ alg: "HS256" }))}.${base64url(JSON.stringify(payload))}.sig`;
}

function samplePage(content: unknown[] = [
  {
    id: 1,
    code: "CERT-AAAA-BBBB",
    recipientName: "Jane Doe",
    courseName: "Advanced Angular",
    status: "ISSUED",
    issueDate: "2026-05-15",
  },
]) {
  return { content, page: { size: 20, number: 0, totalElements: content.length, totalPages: 1 } };
}

/**
 * Used instead of `fixture.whenStable()`, which hung indefinitely on whichever test happened to
 * run last in this file (an NgZone-stability-tracking issue, not anything about the test's own
 * content — reproduced with several unrelated tests placed last). A real macrotask tick lets
 * rxResource's HTTP-backed signal update propagate without depending on zone stability at all.
 */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("CertificateListPageComponent", () => {
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;

  function setup(role: string) {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CertificateListPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
    tokenStorage.setTokens(fakeJwt({ role }), "refresh-1");
    return TestBed.createComponent(CertificateListPageComponent);
  }

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  function flushList(body: object) {
    httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates")).flush(body);
  }

  it("renders a row per certificate on a successful response", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("Jane Doe");
    expect(text).toContain("CERT-AAAA-BBBB");
  });

  it("shows the empty state for zero results", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage([]));
    await tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("No certificates found");
  });

  it("shows the error state with a working retry on a failed request", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates"))
      .flush(null, { status: 500, statusText: "Internal Server Error" });
    await tick();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain("Could not load certificates");

    const retryButton = nativeElement.querySelector<HTMLButtonElement>("button");
    retryButton?.click();
    fixture.detectChanges();

    flushList(samplePage());
    await tick();
    fixture.detectChanges();
    expect(nativeElement.textContent).toContain("Jane Doe");
  });

  it("only re-fetches after the search input debounce settles", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      "input[placeholder='Recipient, course or code']",
    )!;
    input.value = "jane";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();

    httpMock.expectNone((r) => r.url.endsWith("/api/v1/certificates") && r.params.has("q"));

    // Real timer: RxJS's debounceTime schedules via a real timer, no way around actually waiting.
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) => r.url.endsWith("/api/v1/certificates") && r.params.get("q") === "jane",
    );
    req.flush(samplePage());
    await tick();
    fixture.detectChanges();
  }, 10000);

  it("hides the delete action for a non-admin role", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const deleteButton = (fixture.nativeElement as HTMLElement).querySelector(
      "button[aria-label='Delete certificate']",
    );
    expect(deleteButton).toBeNull();
  });

  it("shows the delete action for ADMIN", async () => {
    const fixture = setup("ADMIN");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const deleteButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      "button[aria-label='Delete certificate']",
    );
    expect(deleteButton).not.toBeNull();
  });

  it("calls confirmDelete's dependencies correctly when confirmed", async () => {
    // The click → MatDialog → afterClosed → CertificatesApi.deleteById → reload wiring is
    // straightforward glue code; CertificatesApi.deleteById itself is covered independently in
    // certificates.api.spec.ts. Exercising confirmDelete() directly (rather than through a real
    // DOM click into Angular Material's dialog stack) keeps this test fast and deterministic.
    const fixture = setup("ADMIN");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const openSpy = vi.fn().mockReturnValue({ afterClosed: () => of(true) });
    const component = fixture.componentInstance as unknown as {
      dialog: { open: unknown };
      confirmDelete: (certificate: unknown) => void;
    };
    component.dialog = { open: openSpy };
    component.confirmDelete({ id: 1, code: "CERT-AAAA-BBBB", recipientName: "Jane Doe" });

    expect(openSpy).toHaveBeenCalled();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/1") && r.method === "DELETE")
      .flush(null);
    await tick();
    fixture.detectChanges();

    flushList(samplePage([]));
    await tick();
    fixture.detectChanges();
  });
});
