import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ToastHostComponent } from "./toast-host.component";
import { ToastService } from "./toast.service";

describe("ToastHostComponent", () => {
  let fixture: ComponentFixture<ToastHostComponent>;
  let toastService: ToastService;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const rendered = (): HTMLElement[] =>
    Array.from(host().querySelectorAll<HTMLElement>("[aria-live] > div"));

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [ToastHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(ToastHostComponent);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it("announces a message through a polite live region", () => {
    toastService.success("Certificate deleted.");
    fixture.detectChanges();

    const region = host().querySelector("[aria-live]")!;
    expect(region.getAttribute("aria-live")).toBe("polite");
    // Each toast must be announced on its own rather than re-reading the whole stack.
    expect(region.getAttribute("aria-atomic")).toBe("false");
    expect(rendered().map((node) => node.textContent?.trim())).toEqual([
      expect.stringContaining("Certificate deleted."),
    ]);
  });

  it("marks an error assertively and a success not", () => {
    toastService.error("Could not download the PDF.");
    fixture.detectChanges();

    expect(rendered()[0]?.getAttribute("role")).toBe("alert");

    toastService.dismiss(toastService.toasts()[0]!.id);
    toastService.success("Certificate deleted.");
    fixture.detectChanges();

    expect(rendered()[0]?.hasAttribute("role")).toBe(false);
  });

  it("removes the toast from the DOM when its dismiss button is pressed", () => {
    toastService.success("Certificate deleted.");
    fixture.detectChanges();

    const dismiss = host().querySelector<HTMLButtonElement>(
      "button[aria-label='Dismiss notification']",
    );
    expect(dismiss).not.toBeNull();

    dismiss!.click();
    fixture.detectChanges();

    expect(rendered()).toHaveLength(0);
  });

  it("drops the toast from the DOM once it auto-dismisses", () => {
    toastService.success("Certificate deleted.");
    fixture.detectChanges();
    expect(rendered()).toHaveLength(1);

    vi.advanceTimersByTime(4000);
    fixture.detectChanges();

    expect(rendered()).toHaveLength(0);
  });

  it("stacks several toasts in the order they arrived", () => {
    toastService.success("First");
    toastService.error("Second");
    fixture.detectChanges();

    expect(rendered().map((node) => node.textContent?.trim())).toEqual([
      expect.stringContaining("First"),
      expect.stringContaining("Second"),
    ]);
  });
});
