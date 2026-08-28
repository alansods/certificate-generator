import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { passwordPolicyValidator, passwordsMatchValidator } from "../../../../shared/forms/password-validators";
import { AuthApi } from "../../data/auth.api";

/** Mirrors login-page's own threshold; see design.md ("Cold-start state"). */
const COLD_START_THRESHOLD_MS = 5000;

/** A taken email and a disabled endpoint each get their own treatment; anything else falls back
 * to the server's own message. */
type SignupErrorKind = "email-taken" | "rate-limited" | "disabled" | "generic";

@Component({
  selector: "app-signup-page",
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./signup-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupPageComponent {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup(
    {
      fullName: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
      email: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.email] }),
      password: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required, passwordPolicyValidator],
      }),
      confirmPassword: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [passwordsMatchValidator("password", "confirmPassword")] },
  );

  protected readonly submitting = signal(false);
  protected readonly showColdStart = signal(false);
  protected readonly errorKind = signal<SignupErrorKind | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly formState = signal(0);

  protected readonly fullNameInvalid = computed(() => {
    this.formState();
    return this.form.controls.fullName.invalid && this.form.controls.fullName.touched;
  });

  protected readonly emailInvalid = computed(() => {
    this.formState();
    const control = this.form.controls.email;
    return (control.invalid || this.errorKind() === "email-taken") && control.touched;
  });

  protected readonly emailErrorMessage = computed(() =>
    this.errorKind() === "email-taken"
      ? "That email can't be used."
      : "A valid email is required.",
  );

  protected readonly passwordInvalid = computed(() => {
    this.formState();
    return this.form.controls.password.invalid && this.form.controls.password.touched;
  });

  protected readonly passwordErrorMessage = computed(() => {
    this.formState();
    return this.form.controls.password.hasError("required")
      ? "A password is required."
      : "At least 8 characters, including a digit.";
  });

  /** Blank is reported as "required", not "mismatch" — see passwordsMatchValidator. */
  protected readonly confirmPasswordInvalid = computed(() => {
    this.formState();
    const control = this.form.controls.confirmPassword;
    if (!control.touched) {
      return false;
    }
    return control.invalid || this.form.errors?.["mismatch"] === true;
  });

  protected readonly confirmPasswordErrorMessage = computed(() => {
    this.formState();
    return this.form.controls.confirmPassword.hasError("required")
      ? "Confirm your password."
      : "Passwords do not match.";
  });

  // Optimistic default: showing the form and having submission fail is a smaller cost than
  // blocking a real signup while this lookup is in flight. Mirrors login-page's own reasoning.
  protected readonly registrationEnabled = signal(true);

  constructor() {
    // `statusChanges` does not emit when a control merely becomes touched, so a field blurred
    // while invalid stayed silent until the next keystroke. `events` covers touch and status both.
    this.form.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formState.update((tick) => tick + 1));

    this.authApi
      .registrationEnabled()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (enabled) => this.registrationEnabled.set(enabled),
        // A failed lookup keeps the optimistic default rather than hiding the form.
        error: () => undefined,
      });

    // The 409 is a server-side fact about the value at submit time, not a client validator — it
    // has to be cleared explicitly once the user edits the field, or it would outlive the value
    // that caused it.
    this.form.controls.email.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.errorKind() === "email-taken") {
        this.errorKind.set(null);
      }
    });
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formState.update((tick) => tick + 1);
      return;
    }

    const { fullName, email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.errorKind.set(null);
    this.errorMessage.set(null);
    this.showColdStart.set(false);

    const coldStartTimer = setTimeout(() => this.showColdStart.set(true), COLD_START_THRESHOLD_MS);

    this.authApi
      .register(fullName, email, password)
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
    if (problem.status === 409) {
      this.errorKind.set("email-taken");
      this.form.controls.email.markAsTouched();
      this.form.controls.password.reset("");
      this.form.controls.confirmPassword.reset("");
      this.formState.update((tick) => tick + 1);
      return;
    }
    if (problem.status === 429) {
      this.errorKind.set("rate-limited");
      return;
    }
    if (problem.status === 404) {
      this.errorKind.set("disabled");
      return;
    }
    this.errorKind.set("generic");
    this.errorMessage.set(problem.detail ?? "Something went wrong. Please try again.");
  }
}
