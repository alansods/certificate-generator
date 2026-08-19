import { TestBed } from "@angular/core/testing";
import { ToastService } from "./toast.service";

describe("ToastService", () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it("publishes a message and its kind", () => {
    service.success("Certificate deleted.");

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0]?.message).toBe("Certificate deleted.");
    expect(service.toasts()[0]?.kind).toBe("success");
  });

  it("dismisses itself after four seconds", () => {
    service.error("Could not delete.");

    vi.advanceTimersByTime(3999);
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it("dismisses the right one when several are showing", () => {
    service.success("First");
    service.success("Second");
    const [first] = service.toasts();

    service.dismiss(first!.id);

    expect(service.toasts().map((toast) => toast.message)).toEqual(["Second"]);
  });
});
