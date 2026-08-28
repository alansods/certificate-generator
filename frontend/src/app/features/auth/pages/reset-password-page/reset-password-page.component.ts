import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { passwordPolicyValidator, passwordsMatchValidator } from "../../../../shared/forms/password-validators";
import { AuthApi } from "../../data/auth.api";

/** Long enough that a normal warm-server response never shows it; see login-page's own
 * COLD_START_THRESHOLD_MS and design.md ("Cold-start state"). */
const COLD_START_THRESHOLD_MS = 5000;

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
  protected readonly showColdStart = signal(false);
  protected readonly errorKind = signal<ResetPasswordErrorKind | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly succeeded = signal(false);

  /** Set only when the server rejects the field itself (a 400 with a `newPassword` field error);
   * read by newPasswordErrorMessage() instead of the hardcoded policy text, so the field shows
   * the server's own message rather than a possibly-contradictory generic one. */
  private readonly serverPasswordError = signal<string | null>(null);

  private readonly formState = signal(0);

  protected readonly newPasswordInvalid = computed(() => {
    this.formState();
    return this.form.controls.newPassword.invalid && this.form.controls.newPassword.touched;
  });

  protected readonly newPasswordErrorMessage = computed(() => {
    this.formState();
    const control = this.form.controls.newPassword;
    if (control.hasError("required")) {
      return "A new password is required.";
    }
    if (control.hasError("server")) {
      return this.serverPasswordError() ?? "At least 8 characters, including a digit.";
    }
    return "At least 8 characters, including a digit.";
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

  /** Focus targets for the states that replace the form entirely — see the effects below. */
  private readonly successHeading = viewChild<ElementRef<HTMLHeadingElement>>("successHeading");
  private readonly invalidTokenHeading = viewChild<ElementRef<HTMLHeadingElement>>("invalidTokenHeading");

  constructor() {
    if (this.token) {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState(window.history.state, "", url.toString());
    }

    this.form.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formState.update((tick) => tick + 1));

    // The success and invalid-token states replace the form entirely, and the form is the only
    // branch with an aria-live region — so without this, nothing is ever announced for either
    // outcome. Move focus to the new state's heading instead.
    effect(() => {
      if (this.succeeded()) {
        setTimeout(() => this.successHeading()?.nativeElement.focus());
      }
    });
    effect(() => {
      if (this.errorKind() === "invalid-token") {
        setTimeout(() => this.invalidTokenHeading()?.nativeElement.focus());
      }
    });
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
    this.serverPasswordError.set(null);
    this.showColdStart.set(false);

    const coldStartTimer = setTimeout(() => this.showColdStart.set(true), COLD_START_THRESHOLD_MS);

    this.authApi
      .resetPassword(this.token, newPassword)
      .pipe(
        finalize(() => {
          clearTimeout(coldStartTimer);
          this.submitting.set(false);
          this.showColdStart.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
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
      // Shown next to the field only (via newPasswordErrorMessage()), not duplicated in the
      // generic error banner — the two must never disagree about what's wrong with the password.
      this.serverPasswordError.set(problem.fieldErrors["newPassword"]);
      this.form.controls.newPassword.setErrors({ server: true });
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
