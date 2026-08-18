import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { AuthApi } from "../../data/auth.api";

/** Long enough that a normal warm-server login never shows it; see design.md ("Cold-start state"). */
const COLD_START_THRESHOLD_MS = 5000;

/** Rejected credentials and rate limiting get their own treatments; anything else falls back to
 * the server's own message. */
type LoginErrorKind = "credentials" | "rate-limited" | "generic";

@Component({
  selector: "app-login-page",
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./login-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup({
    email: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly submitting = signal(false);
  protected readonly showColdStart = signal(false);
  protected readonly errorKind = signal<LoginErrorKind | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly formState = signal(0);

  protected readonly emailInvalid = computed(() => {
    this.formState();
    return this.form.controls.email.invalid && this.form.controls.email.touched;
  });

  protected readonly passwordInvalid = computed(() => {
    this.formState();
    return this.form.controls.password.invalid && this.form.controls.password.touched;
  });

  constructor() {
    // `statusChanges` does not emit when a control merely becomes touched, so a field blurred
    // while invalid stayed silent until the next keystroke. `events` covers touch and status both.
    this.form.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formState.update((tick) => tick + 1));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formState.update((tick) => tick + 1);
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.errorKind.set(null);
    this.errorMessage.set(null);
    this.showColdStart.set(false);

    const coldStartTimer = setTimeout(() => this.showColdStart.set(true), COLD_START_THRESHOLD_MS);

    this.authApi
      .login(email, password)
      .pipe(
        finalize(() => {
          clearTimeout(coldStartTimer);
          this.submitting.set(false);
          this.showColdStart.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl("/"),
        error: (error: unknown) => this.handle(error),
      });
  }

  private handle(error: unknown): void {
    const problem = toProblemDetail(error);
    if (problem.status === 401) {
      this.errorKind.set("credentials");
      return;
    }
    if (problem.status === 429) {
      this.errorKind.set("rate-limited");
      return;
    }
    this.errorKind.set("generic");
    this.errorMessage.set(problem.detail ?? "Something went wrong. Please try again.");
  }
}
