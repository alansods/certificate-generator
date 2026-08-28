import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { SessionService } from "../../../../core/auth/session.service";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { passwordPolicyValidator, passwordsMatchValidator } from "../../../../shared/forms/password-validators";
import { ToastService } from "../../../../shared/toast/toast.service";
import { AuthApi } from "../../../auth/data/auth.api";

@Component({
  selector: "app-profile-page",
  imports: [ReactiveFormsModule],
  templateUrl: "./profile-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentUser = this.session.currentUser;
  protected readonly sessionLoading = this.session.loading;
  protected readonly sessionLoadFailed = this.session.loadFailed;

  protected readonly initials = computed(() => {
    const name = this.currentUser()?.fullName?.trim();
    if (!name) {
      return null;
    }
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase();
  });

  protected readonly profileForm = new FormGroup({
    fullName: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly passwordForm = new FormGroup(
    {
      currentPassword: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required],
      }),
      newPassword: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required, passwordPolicyValidator],
      }),
      confirmPassword: new FormControl("", {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [passwordsMatchValidator("newPassword", "confirmPassword")] },
  );

  protected readonly profileSubmitting = signal(false);
  protected readonly profileSubmitError = signal<string | null>(null);
  protected readonly showProfileValidationSummary = signal(false);

  protected readonly passwordSubmitting = signal(false);
  protected readonly passwordSubmitError = signal<string | null>(null);
  protected readonly showPasswordValidationSummary = signal(false);

  constructor() {
    // Rather than reading currentUser() once: SessionService.load() resolves asynchronously, so
    // a component constructed before that GET /me returns would otherwise render an empty form
    // under an already-populated identity header. Skipped once the user starts typing, so a
    // save's own updateCurrentUser() doesn't stomp on an in-progress edit.
    effect(() => {
      const user = this.currentUser();
      if (user && this.profileForm.pristine) {
        this.profileForm.setValue({ fullName: user.fullName, email: user.email });
      }
    });

    // Clears the "check the highlighted fields" banner once the user has actually fixed the
    // fields, rather than leaving it shown until the next submit attempt.
    this.profileForm.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.profileForm.valid) {
        this.showProfileValidationSummary.set(false);
      }
    });
    this.passwordForm.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.passwordForm.valid) {
        this.showPasswordValidationSummary.set(false);
      }
    });
  }

  protected isInvalid(form: FormGroup, field: string): boolean {
    const control = form.get(field);
    if (!control) {
      return false;
    }
    const hasGroupMismatch = field === "confirmPassword" && !!form.errors?.["mismatch"];
    return (control.invalid || hasGroupMismatch) && control.touched;
  }

  protected errorFor(form: FormGroup, field: string, fallback: string): string {
    const control = form.get(field);
    const server = control?.errors?.["server"];
    if (typeof server === "string") {
      return server;
    }
    if (control?.errors?.["policy"]) {
      return "Must be at least 8 characters and contain a digit.";
    }
    if (field === "confirmPassword" && form.errors?.["mismatch"]) {
      return "Passwords do not match.";
    }
    if (control?.errors?.["email"]) {
      return "Enter a valid email address.";
    }
    return fallback;
  }

  protected retryLoad(): void {
    this.session.load();
  }

  protected submitProfile(): void {
    if (this.profileSubmitting()) {
      return;
    }
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.showProfileValidationSummary.set(true);
      return;
    }
    this.showProfileValidationSummary.set(false);
    this.profileSubmitError.set(null);
    this.profileSubmitting.set(true);

    const { fullName, email } = this.profileForm.getRawValue();
    this.authApi
      .updateProfile(fullName, email)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.profileSubmitting.set(false);
          this.session.updateCurrentUser(user);
          this.profileForm.markAsPristine();
          this.toast.success("Profile updated.");
        },
        error: (error: unknown) => {
          this.profileSubmitting.set(false);
          this.handleSubmitError(this.profileForm, this.profileSubmitError, error);
        },
      });
  }

  protected submitPassword(): void {
    if (this.passwordSubmitting()) {
      return;
    }
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.showPasswordValidationSummary.set(true);
      return;
    }
    this.showPasswordValidationSummary.set(false);
    this.passwordSubmitError.set(null);
    this.passwordSubmitting.set(true);

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.authApi
      .changePassword(currentPassword, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.passwordSubmitting.set(false);
          this.passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
          this.toast.success("Password changed. Other devices have been signed out.");
        },
        error: (error: unknown) => {
          this.passwordSubmitting.set(false);
          this.handleSubmitError(this.passwordForm, this.passwordSubmitError, error);
        },
      });
  }

  private handleSubmitError(
    form: FormGroup,
    submitError: ReturnType<typeof signal<string | null>>,
    error: unknown,
  ): void {
    const problem = toProblemDetail(error);
    if (problem.fieldErrors) {
      let appliedToAControl = false;
      for (const [field, message] of Object.entries(problem.fieldErrors)) {
        const control = form.get(field);
        if (!control) {
          continue;
        }
        control.setErrors({ ...(control.errors ?? {}), server: message });
        control.markAsTouched();
        appliedToAControl = true;
      }
      if (appliedToAControl) {
        return;
      }
      // fieldErrors was present but didn't name any control on this form (e.g. empty, or an
      // unexpected key) — fall through to the generic message instead of leaving the spinner
      // cleared with nothing shown to the user.
    }
    submitError.set(problem.detail ?? "Something went wrong. Please try again.");
  }
}
