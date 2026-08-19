import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { ConfirmDialogService } from "../../../../shared/confirm-dialog/confirm-dialog.service";
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
    recipientEmail: "jane@example.edu",
    courseName: "Advanced Angular",
    workloadHours: 40,
    template: "CLASSIC",
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
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
      ],
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

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("No certificates yet");
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
      "input[placeholder='Search by recipient, course or code']",
    );
    if (!input) {
      throw new Error("Expected to find the search input");
    }
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

  function openRowMenu(fixture: { nativeElement: unknown }): void {
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      "button[aria-haspopup='menu']",
    );
    if (!trigger) {
      throw new Error("Expected the row's actions trigger");
    }
    trigger.click();
  }

  function menuItem(fixture: { nativeElement: unknown }, label: string): HTMLElement | undefined {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>("[role='menuitem']")].find(
      (item) => item.textContent?.trim() === label,
    );
  }

  it("hides the delete action for a non-admin role", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    openRowMenu(fixture);
    fixture.detectChanges();

    expect(menuItem(fixture, "Delete")).toBeUndefined();
    expect(menuItem(fixture, "Edit")).toBeDefined();
  });

  it("shows the delete action for ADMIN", async () => {
    const fixture = setup("ADMIN");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    openRowMenu(fixture);
    fixture.detectChanges();

    expect(menuItem(fixture, "Delete")).toBeDefined();
  });

  it("confirming delete removes the certificate and reloads the list", async () => {
    const fixture = setup("ADMIN");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const confirmSpy = vi
      .spyOn(TestBed.inject(ConfirmDialogService), "confirm")
      .mockReturnValue(of(true));

    openRowMenu(fixture);
    fixture.detectChanges();
    menuItem(fixture, "Delete")?.click();
    fixture.detectChanges();

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({ destructive: true, confirmLabel: "Delete" }),
    );
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/1") && r.method === "DELETE")
      .flush(null);
    await tick();
    fixture.detectChanges();

    flushList(samplePage([]));
    await tick();
    fixture.detectChanges();
  });

  it("does not delete when the confirmation is dismissed", async () => {
    const fixture = setup("ADMIN");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();
    vi.spyOn(TestBed.inject(ConfirmDialogService), "confirm").mockReturnValue(of(false));

    openRowMenu(fixture);
    fixture.detectChanges();
    menuItem(fixture, "Delete")?.click();
    fixture.detectChanges();

    // httpMock.verify() asserts no DELETE went out.
  });

  it("the preview action links to the certificate's preview page", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    openRowMenu(fixture);
    fixture.detectChanges();
    const previewLink = menuItem(fixture, "Preview") as HTMLAnchorElement | undefined;
    expect(previewLink).not.toBeNull();
    expect(previewLink?.getAttribute("href")).toBe("/certificates/1/preview");
  });

  it("closes an open row menu when another row's menu is opened", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    const [first] = samplePage().content as Record<string, unknown>[];
    flushList(samplePage([first, { ...first, id: 2, code: "CERT-CCCC-DDDD" }]));
    await tick();
    fixture.detectChanges();

    const triggers = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        "button[aria-haspopup='menu']",
      ),
    ];
    triggers[0]?.click();
    fixture.detectChanges();

    expect(triggers[0]?.getAttribute("aria-expanded")).toBe("true");

    triggers[1]?.click();
    fixture.detectChanges();

    // Otherwise scrolling a long list leaves panels open over rows nobody is looking at.
    expect(triggers[0]?.getAttribute("aria-expanded")).toBe("false");
    expect(triggers[1]?.getAttribute("aria-expanded")).toBe("true");
  });

  it("closes the row menu on Escape and puts focus back on the trigger", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      "button[aria-haspopup='menu']",
    );
    trigger?.click();
    fixture.detectChanges();

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    fixture.detectChanges();

    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("closes the row menu on a click outside it", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      "button[aria-haspopup='menu']",
    );
    trigger?.click();
    fixture.detectChanges();

    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    fixture.detectChanges();

    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
  });

  it("holds the table's shape while a request is in flight", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const placeholders = nativeElement.querySelectorAll(".skeleton");

    expect(placeholders.length).toBeGreaterThan(0);
    // Same column template as the real rows, so the layout cannot shift when they arrive.
    const skeletonRow = placeholders[0]?.parentElement;
    expect(skeletonRow?.getAttribute("style")).toContain("grid-template-columns");

    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    expect(nativeElement.querySelectorAll(".skeleton")).toHaveLength(0);
  });

  it("distinguishes an empty dataset from a search that matched nothing", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage([]));
    await tick();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain("No certificates yet");
    expect(nativeElement.textContent).not.toContain("Clear search");

    const input = nativeElement.querySelector<HTMLInputElement>("input");
    if (!input) {
      throw new Error("Expected the search input");
    }
    input.value = "nothing-matches";
    input.dispatchEvent(new Event("input"));
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates") && r.params.get("q") === "nothing-matches")
      .flush(samplePage([]));
    await tick();
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain("No certificates match");
    expect(nativeElement.textContent).toContain("Clear search");
  }, 10000);

  it("offers 10, 20 and 50 rows per page and re-fetches on a change", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>("select");
    if (!select) {
      throw new Error("Expected the page size control");
    }

    expect([...select.options].map((option) => option.value)).toEqual(["10", "20", "50"]);

    select.value = "50";
    select.dispatchEvent(new Event("change"));
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates") && r.params.get("size") === "50")
      .flush(samplePage());
    await tick();
    fixture.detectChanges();
  });

  it("sends no status filter, since the screen no longer offers one", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();

    const request = httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates"));

    expect(request.request.params.has("status")).toBe(false);

    request.flush(samplePage());
    await tick();
    fixture.detectChanges();
  });
});
