import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { ConfirmDialogService } from "../../../../shared/confirm-dialog/confirm-dialog.service";
import { ToastHostComponent } from "../../../../shared/toast/toast-host.component";
import { CertificateListPageComponent } from "./certificate-list-page.component";

function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (value: string) =>
    btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${base64url(JSON.stringify({ alg: "HS256" }))}.${base64url(JSON.stringify(payload))}.sig`;
}

const SECOND_ROW = {
  id: 2,
  code: "CERT-CCCC-DDDD",
  recipientName: "John Roe",
  recipientEmail: "john@example.edu",
  courseName: "Reactive Forms",
  workloadHours: 20,
  template: "MODERN",
  status: "ISSUED",
  issueDate: "2026-05-16",
};

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
    for (const overlay of document.querySelectorAll(".cdk-overlay-container")) {
      overlay.remove();
    }
  });

  function flushList(body: object) {
    httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates")).flush(body);
  }

  it("shows every field the row is specified to carry", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const row = (fixture.nativeElement as HTMLElement).querySelectorAll("[role='row']")[1];
    const text = row?.textContent ?? "";

    expect(text).toContain("CERT-AAAA-BBBB");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("jane@example.edu");
    expect(text).toContain("Advanced Angular");
    expect(text).toContain("40 h");
    expect(text).toContain("CLASSIC");
    expect(text).toContain("2026-05-15");
  });

  it("shows the traceId when the failing response carried one", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates")).flush(
      { type: "about:blank", title: "Internal Server Error", status: 500, traceId: "abc-123" },
      { status: 500, statusText: "Internal Server Error" },
    );
    await tick();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";

    expect(text).toContain("Could not load certificates");
    expect(text).toContain("abc-123");
  });

  it("downloads the PDF from the row menu without navigating", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    openRowMenu(fixture);
    fixture.detectChanges();
    menuItem("Download PDF")?.click();
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/1/pdf") && r.method === "GET")
      .flush(new Blob(["%PDF-1.4"], { type: "application/pdf" }));
    await tick();
  });

  it("reports a failed download rather than failing silently", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();
    const toasts = renderToastHost();

    openRowMenu(fixture);
    fixture.detectChanges();
    menuItem("Download PDF")?.click();
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates/1/pdf"))
      .flush(null, { status: 500, statusText: "Internal Server Error" });
    await tick();

    expect(toasts.text()).toContain("CERT-AAAA-BBBB");
    expect(toasts.roles()).toEqual(["alert"]);
  });

  it("reports a successful delete", async () => {
    const fixture = setup("ADMIN");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();
    const toasts = renderToastHost();
    vi.spyOn(TestBed.inject(ConfirmDialogService), "confirm").mockReturnValue(of(true));

    openRowMenu(fixture);
    fixture.detectChanges();
    menuItem("Delete")?.click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.method === "DELETE").flush(null);
    await tick();

    expect(toasts.text()).toContain("CERT-AAAA-BBBB");
    // A success is announced politely, so it must not carry the assertive alert role.
    expect(toasts.roles()).toEqual([null]);

    flushList(samplePage([]));
    await tick();
    fixture.detectChanges();
  });

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

  it("offers creating and importing from the page header", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const header = (fixture.nativeElement as HTMLElement).querySelector("h1")?.parentElement;
    if (!header) {
      throw new Error("Expected the page header");
    }
    const actions = [...header.querySelectorAll("a")].map((link) => [
      link.textContent?.trim(),
      link.getAttribute("href"),
    ]);

    expect(actions).toEqual(
      expect.arrayContaining([
        ["New certificate", "/certificates/new"],
        ["Import CSV", "/certificates/batch"],
      ]),
    );
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

  it("clears the search from a control inside the field", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const clearControl = () =>
      nativeElement.querySelector<HTMLButtonElement>(
        "input[placeholder='Search by recipient, course or code'] ~ button[aria-label='Clear search']",
      );

    expect(clearControl()).toBeNull();

    const input = nativeElement.querySelector<HTMLInputElement>(
      "input[placeholder='Search by recipient, course or code']",
    );
    if (!input) {
      throw new Error("Expected to find the search input");
    }
    input.value = "jane";
    input.dispatchEvent(new Event("input"));

    // Real timer: RxJS's debounceTime schedules via a real timer, no way around actually waiting.
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates") && r.params.get("q") === "jane")
      .flush(samplePage());
    await tick();
    fixture.detectChanges();

    const clear = clearControl();
    if (!clear) {
      throw new Error("Expected the in-field clear control once the search holds a term");
    }
    clear.click();
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();

    expect(input.value).toBe("");
    // An empty term drops the parameter rather than sending `q=`.
    httpMock
      .expectOne((r) => r.url.endsWith("/api/v1/certificates") && !r.params.has("q"))
      .flush(samplePage());
    await tick();
    fixture.detectChanges();

    expect(clearControl()).toBeNull();
  }, 10000);

  /** The CDK renders the panel in an overlay, outside the component's own element. */
  function rowTriggers(fixture: { nativeElement: unknown }): HTMLButtonElement[] {
    return [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        "button[aria-haspopup='menu']",
      ),
    ];
  }

  function openRowMenu(fixture: { nativeElement: unknown }, index = 0): void {
    const trigger = rowTriggers(fixture)[index];
    if (!trigger) {
      throw new Error("Expected the row's actions trigger");
    }
    trigger.click();
  }

  /**
   * The shell renders the host in the real application; rendering it here lets the toast cases
   * assert what reaches the screen rather than what the service happens to hold.
   */
  function renderToastHost(): { text: () => string; roles: () => (string | null)[] } {
    const hostFixture = TestBed.createComponent(ToastHostComponent);
    hostFixture.detectChanges();
    const nodes = () =>
      Array.from(
        (hostFixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
          "[aria-live] > div",
        ),
      );
    return {
      text: () => {
        hostFixture.detectChanges();
        return nodes()
          .map((node) => node.textContent?.trim() ?? "")
          .join(" | ");
      },
      roles: () => {
        hostFixture.detectChanges();
        return nodes().map((node) => node.getAttribute("role"));
      },
    };
  }

  const KEY_CODES: Record<string, number> = { Escape: 27, ArrowUp: 38, ArrowDown: 40 };

  function pressKey(key: string): void {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    Object.defineProperty(event, "keyCode", { get: () => KEY_CODES[key] ?? 0 });
    (document.activeElement ?? document.body).dispatchEvent(event);
  }

  function menuItem(label: string): HTMLElement | undefined {
    return [...document.querySelectorAll<HTMLElement>("[role='menuitem']")].find(
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

    expect(menuItem("Delete")).toBeUndefined();
    expect(menuItem("Edit")?.getAttribute("href")).toBe("/certificates/1/edit");
  });

  it("shows the delete action for ADMIN", async () => {
    const fixture = setup("ADMIN");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    openRowMenu(fixture);
    fixture.detectChanges();

    expect(menuItem("Delete")).toBeDefined();
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
    menuItem("Delete")?.click();
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
    menuItem("Delete")?.click();
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
    const previewLink = menuItem("Preview") as HTMLAnchorElement | undefined;
    expect(previewLink).toBeDefined();
    expect(previewLink?.getAttribute("href")).toBe("/certificates/1/preview");
  });

  it("opens the row's actions in a menu the keyboard can drive", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    openRowMenu(fixture);
    fixture.detectChanges();

    const menu = document.querySelector("[role='menu']");

    expect(menu).not.toBeNull();
    expect(menu?.getAttribute("aria-label")).toBe("Actions for CERT-AAAA-BBBB");
    // Every item is a real menuitem, which is what makes arrow-key navigation the CDK provides
    // match the role the panel advertises.
    expect(document.querySelectorAll("[role='menuitem']").length).toBeGreaterThan(0);
  });

  it("keeps only one row menu open at a time", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage([samplePage().content[0], SECOND_ROW]));
    await tick();
    fixture.detectChanges();

    openRowMenu(fixture, 0);
    fixture.detectChanges();
    expect(document.querySelectorAll("[role='menu']")).toHaveLength(1);

    openRowMenu(fixture, 1);
    fixture.detectChanges();

    const menus = document.querySelectorAll("[role='menu']");
    expect(menus).toHaveLength(1);
    expect(menus[0]?.getAttribute("aria-label")).toBe("Actions for CERT-CCCC-DDDD");
  });

  it("closes the row menu on Escape and returns focus to its trigger", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const trigger = rowTriggers(fixture)[0];
    if (!trigger) {
      throw new Error("Expected the row's actions trigger");
    }
    trigger.click();
    fixture.detectChanges();
    expect(document.querySelector("[role='menu']")).not.toBeNull();

    pressKey("Escape");
    fixture.detectChanges();

    expect(document.querySelector("[role='menu']")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes the row menu when the pointer goes elsewhere", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    openRowMenu(fixture);
    fixture.detectChanges();
    expect(document.querySelector("[role='menu']")).not.toBeNull();

    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    fixture.detectChanges();

    expect(document.querySelector("[role='menu']")).toBeNull();
  });

  it("moves focus between menu items with the arrow keys", async () => {
    const fixture = setup("ADMIN");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    openRowMenu(fixture);
    fixture.detectChanges();

    const items = [...document.querySelectorAll<HTMLElement>("[role='menuitem']")];
    expect(items.length).toBeGreaterThan(1);
    // The CDK puts focus on the first item as the panel opens.
    expect(document.activeElement).toBe(items[0]);

    pressKey("ArrowDown");
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[1]);

    pressKey("ArrowUp");
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[0]);
  });

  it("steps back a page rather than showing the empty state past the end", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList({ content: [SECOND_ROW], page: { size: 20, number: 0, totalElements: 25, totalPages: 2 } });
    await tick();
    fixture.detectChanges();

    const nextPage = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      "button[aria-label='Next page']",
    );
    if (!nextPage) {
      throw new Error("Expected the next-page control");
    }
    nextPage.click();
    fixture.detectChanges();

    // While the user sat on page 1, the dataset shrank to a single page.
    flushList({ content: [], page: { size: 20, number: 1, totalElements: 3, totalPages: 1 } });
    await tick();
    fixture.detectChanges();

    const retry = httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates"));
    expect(retry.request.params.get("page")).toBe("0");

    retry.flush(samplePage());
    await tick();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain("No certificates yet");
  });

  it("holds the table's shape while a request is in flight", async () => {
    const fixture = setup("USER");
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const placeholders = nativeElement.querySelectorAll(".skeleton");

    expect(placeholders.length).toBeGreaterThan(0);
    // Same column token as the real rows, so the layout cannot shift when they arrive.
    const skeletonRow = placeholders[0]?.parentElement;
    expect(skeletonRow?.className).toContain("grid-cols-(--list-columns)");

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

  it("shows the page size it is actually using", async () => {
    // The control used to be a plain `[value]` binding, applied before `@for` had rendered the
    // options, so the browser fell back to the first one: it read 10 while the request asked 20.
    const fixture = setup("USER");
    fixture.detectChanges();
    const request = httpMock.expectOne((r) => r.url.endsWith("/api/v1/certificates"));
    request.flush(samplePage());
    await tick();
    fixture.detectChanges();

    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>("select");

    expect(select?.value).toBe(request.request.params.get("size"));
    expect(select?.value).toBe("20");
  });

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

  it("keeps the column headers in the accessibility tree at every width", async () => {
    // Hiding the header row with `display: none` below the medium breakpoint would leave a table
    // whose cells belong to no column, which is worse for a screen reader than a plain list.
    const fixture = setup("USER");
    fixture.detectChanges();
    flushList(samplePage());
    await tick();
    fixture.detectChanges();

    const header = (fixture.nativeElement as HTMLElement).querySelector("[role='row']");
    const headers = [...(header?.querySelectorAll("[role='columnheader']") ?? [])].map((cell) =>
      cell.textContent?.trim(),
    );

    expect(headers).toEqual(["Code", "Recipient", "Course", "Issue date", "Actions"]);
    expect(header?.className).toContain("sr-only");
    expect(header?.className).not.toContain("hidden");
  });
});
