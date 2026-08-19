import { inject, Injectable, signal } from "@angular/core";
import { DestroyRef } from "@angular/core";

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly kind: "success" | "error";
}

/** Four seconds, matching docs/design-spec.md section 2. */
const DISMISS_AFTER_MS = 4000;

let nextId = 0;

/**
 * The application's own snackbar. `MatSnackBar` is named in the design specification but was
 * never actually imported here, so there is nothing to replace — only something to provide.
 */
@Injectable({ providedIn: "root" })
export class ToastService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastsSignal = signal<readonly Toast[]>([]);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  readonly toasts = this.toastsSignal.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => {
      for (const timer of this.timers) {
        clearTimeout(timer);
      }
      this.timers.clear();
    });
  }

  success(message: string): void {
    this.show(message, "success");
  }

  error(message: string): void {
    this.show(message, "error");
  }

  dismiss(id: number): void {
    this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private show(message: string, kind: Toast["kind"]): void {
    const id = nextId++;
    this.toastsSignal.update((toasts) => [...toasts, { id, message, kind }]);
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.dismiss(id);
    }, DISMISS_AFTER_MS);
    this.timers.add(timer);
  }
}
