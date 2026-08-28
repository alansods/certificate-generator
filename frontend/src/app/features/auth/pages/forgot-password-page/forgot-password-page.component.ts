import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { AuthApi } from "../../data/auth.api";

/** Long enough that a normal warm-server request never shows it; see login-page's own
 * COLD_START_THRESHOLD_MS and design.md ("Cold-start state"). */
const COLD_START_THRESHOLD_MS = 5000;

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
  protected readonly showColdStart = signal(false);
  protected readonly errorKind = signal<ForgotPasswordErrorKind | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  /** Set once a request completes; the confirmation card names this address, then "use another
   * email" clears it and returns the empty form — see design.md "Always answering 202". */
  protected readonly submittedEmail = signal<string | null>(null);

  private readonly formState = signal(0);

  protected readonly emailInvalid = computed(() => {
    this.formState();
    const control = this.form.controls.email;
    return control.invalid && control.touched;
  });

  /** Focus targets for the state transitions between the form and the confirmation card — see
   * the accessibility note on submit()/useAnotherEmail() below. */
  private readonly confirmationHeading = viewChild<ElementRef<HTMLHeadingElement>>("confirmationHeading");
  private readonly emailInputRef = viewChild<ElementRef<HTMLInputElement>>("emailInputRef");

  constructor() {
    this.form.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.formState.update((tick) => tick + 1);
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

    const email = this.form.controls.email.value;
    this.submitting.set(true);
    this.errorKind.set(null);
    this.errorMessage.set(null);
    this.showColdStart.set(false);

    const coldStartTimer = setTimeout(() => this.showColdStart.set(true), COLD_START_THRESHOLD_MS);

    this.authApi
      .forgotPassword(email)
      .pipe(
        finalize(() => {
          clearTimeout(coldStartTimer);
          this.submitting.set(false);
          this.showColdStart.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.submittedEmail.set(email);
          // Nothing is announced when the form is swapped for the confirmation card; move focus
          // to its heading so a screen reader picks up the state change.
          setTimeout(() => this.confirmationHeading()?.nativeElement.focus());
        },
        error: (error: unknown) => this.handle(error),
      });
  }

  /** Returns to the empty form, per the "use another email" scenario. */
  protected useAnotherEmail(): void {
    this.submittedEmail.set(null);
    this.form.reset();
    // Mirrors the focus move on submit(): the form reappears in place of the confirmation card,
    // so focus returns to the field the visitor is expected to fill in next.
    setTimeout(() => this.emailInputRef()?.nativeElement.focus());
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
