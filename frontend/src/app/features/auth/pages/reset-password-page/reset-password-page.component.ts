import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { passwordPolicyValidator, passwordsMatchValidator } from "../../../../shared/forms/password-validators";
import { AuthApi } from "../../data/auth.api";

type ResetPasswordErrorKind = "invalid-token" | "rate-limited" | "generic";

@Component({
  selector: "app-reset-password-page",
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./reset-password-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPageComponent {
  private readonly authApi = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Read once at construction and immediately stripped from the address bar — see
   * design.md "Why the token goes in a query parameter": a query parameter can be removed with
   * history.replaceState on load, which a path segment cannot do without a navigation. */
  protected readonly token: string | null = this.route.snapshot.queryParamMap.get("token");

  protected readonly form = new FormGroup(
    {
      newPassword: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required, passwordPolicyValidator],
      }),
      confirmPassword: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [passwordsMatchValidator("newPassword", "confirmPassword")] },
  );

  protected readonly submitting = signal(false);
  protected readonly errorKind = signal<ResetPasswordErrorKind | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly succeeded = signal(false);

  private readonly formState = signal(0);

  protected readonly newPasswordInvalid = computed(() => {
    this.formState();
    return this.form.controls.newPassword.invalid && this.form.controls.newPassword.touched;
  });

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
      ? "Confirm your new password."
      : "Passwords do not match.";
  });

  constructor() {
    if (window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState(window.history.state, "", url.toString());
    }

    this.form.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formState.update((tick) => tick + 1));
  }

  protected submit(): void {
    if (this.submitting() || !this.token) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formState.update((tick) => tick + 1);
      return;
    }

    const newPassword = this.form.controls.newPassword.value;
    this.submitting.set(true);
    this.errorKind.set(null);
    this.errorMessage.set(null);

    this.authApi
      .resetPassword(this.token, newPassword)
      .pipe(finalize(() => this.submitting.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.succeeded.set(true),
        error: (error: unknown) => this.handle(error),
      });
  }

  private handle(error: unknown): void {
    const problem = toProblemDetail(error);
    if (problem.status === 429) {
      this.errorKind.set("rate-limited");
      return;
    }
    if (problem.fieldErrors?.["newPassword"]) {
      this.form.controls.newPassword.setErrors({ server: true });
      this.errorKind.set("generic");
      this.errorMessage.set(problem.fieldErrors["newPassword"]);
      return;
    }
    if (problem.status === 400) {
      this.errorKind.set("invalid-token");
      return;
    }
    this.errorKind.set("generic");
    this.errorMessage.set(problem.detail ?? "Something went wrong. Please try again.");
  }
}
