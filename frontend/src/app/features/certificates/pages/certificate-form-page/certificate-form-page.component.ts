import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { ActivatedRoute, Router } from "@angular/router";
import { finalize } from "rxjs";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { ConfirmDialogComponent } from "../../../../shared/confirm-dialog.component";
import { CertificateTemplate } from "../../data/certificate-page-response";
import { CertificateRequest } from "../../data/certificate-request";
import { CertificatesApi } from "../../data/certificates.api";

const TEMPLATES: CertificateTemplate[] = ["CLASSIC", "MODERN", "MINIMAL"];

@Component({
  selector: "app-certificate-form-page",
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./certificate-form-page.component.html",
  styleUrl: "./certificate-form-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateFormPageComponent {
  private readonly certificatesApi = inject(CertificatesApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly templates = TEMPLATES;
  protected readonly certificateId: number | null = (() => {
    const raw = this.route.snapshot.paramMap.get("id");
    return raw ? Number(raw) : null;
  })();
  protected readonly isEditMode = this.certificateId !== null;
  protected readonly isAdmin = computed(() => this.tokenStorage.role() === "ADMIN");

  protected readonly form = new FormGroup({
    recipientName: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    recipientEmail: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
    courseName: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    workloadHours: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    completionDate: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    issueDate: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    instructorName: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    template: new FormControl<CertificateTemplate>("CLASSIC", { nonNullable: true }),
  });

  protected readonly submitting = signal(false);
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);

  constructor() {
    const id = this.certificateId;
    if (id !== null) {
      this.loading.set(true);
      this.certificatesApi
        .get(id)
        .pipe(
          finalize(() => this.loading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (certificate) => this.form.patchValue(certificate),
          error: () => this.loadError.set("Could not load this certificate."),
        });
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitError.set(null);
    this.submitting.set(true);
    const request = this.form.getRawValue() as CertificateRequest;
    const save$ =
      this.certificateId !== null
        ? this.certificatesApi.update(this.certificateId, request)
        : this.certificatesApi.create(request);

    save$
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigateByUrl("/certificates"),
        error: (error: unknown) => this.handleSubmitError(error),
      });
  }

  protected confirmDelete(): void {
    if (this.certificateId === null) {
      return;
    }
    const id = this.certificateId;

    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: "Delete certificate",
          message: "Delete this certificate? This cannot be undone.",
          confirmLabel: "Delete",
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean | undefined) => {
        if (confirmed) {
          this.certificatesApi
            .deleteById(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => void this.router.navigateByUrl("/certificates"));
        }
      });
  }

  private handleSubmitError(error: unknown): void {
    const problem = toProblemDetail(error);
    if (problem.fieldErrors) {
      for (const [field, message] of Object.entries(problem.fieldErrors)) {
        const control = this.form.get(field);
        control?.setErrors({ ...(control.errors ?? {}), server: message });
      }
      return;
    }
    this.submitError.set(problem.detail ?? "Something went wrong. Please try again.");
  }
}
