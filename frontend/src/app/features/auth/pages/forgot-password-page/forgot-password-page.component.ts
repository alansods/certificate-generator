import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { AuthApi } from "../../data/auth.api";

type ForgotPasswordErrorKind = "rate-limited" | "generic";

@Component({
  selector: "app-forgot-password-page",
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./forgot-password-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  private readonly authApi = inject(AuthApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup({
    email: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  protected readonly submitting = signal(false);
  protected readonly errorKind = signal<ForgotPasswordErrorKind | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  /** Set once a request completes; the confirmation card names this address, then "use another
   * email" clears it and returns the empty form — see design.md "Always answering 202". */
  protected readonly submittedEmail = signal<string | null>(null);

  private readonly formState = signal(0);

  protected readonly emailInvalid = signal(false);

  constructor() {
    this.form.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formState.update((tick) => tick + 1);
        this.emailInvalid.set(this.form.controls.email.invalid && this.form.controls.email.touched);
      });
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.emailInvalid.set(this.form.controls.email.invalid);
      return;
    }

    const email = this.form.controls.email.value;
    this.submitting.set(true);
    this.errorKind.set(null);
    this.errorMessage.set(null);

    this.authApi
      .forgotPassword(email)
      .pipe(finalize(() => this.submitting.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.submittedEmail.set(email),
        error: (error: unknown) => this.handle(error),
      });
  }

  /** Returns to the empty form, per the "use another email" scenario. */
  protected useAnotherEmail(): void {
    this.submittedEmail.set(null);
    this.form.reset();
  }

  private handle(error: unknown): void {
    const problem = toProblemDetail(error);
    if (problem.status === 429) {
      this.errorKind.set("rate-limited");
      return;
    }
    this.errorKind.set("generic");
    this.errorMessage.set(problem.detail ?? "Something went wrong. Please try again.");
  }
}
