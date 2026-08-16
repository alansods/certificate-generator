import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { Router } from "@angular/router";
import { finalize } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { AuthApi } from "../../data/auth.api";

/** Long enough that a normal warm-server login never shows it; see design.md ("Cold-start state"). */
const COLD_START_THRESHOLD_MS = 5000;

@Component({
  selector: "app-login-page",
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./login-page.component.html",
  styleUrl: "./login-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    email: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly submitting = signal(false);
  protected readonly showColdStart = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
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
      )
      .subscribe({
        next: () => void this.router.navigateByUrl("/"),
        error: (error: unknown) => this.errorMessage.set(this.messageFor(error)),
      });
  }

  private messageFor(error: unknown): string {
    const problem = toProblemDetail(error);
    if (problem.status === 401) {
      return "Invalid email or password.";
    }
    if (problem.status === 429) {
      return "Too many attempts. Try again in a few minutes.";
    }
    return problem.detail ?? "Something went wrong. Please try again.";
  }
}
