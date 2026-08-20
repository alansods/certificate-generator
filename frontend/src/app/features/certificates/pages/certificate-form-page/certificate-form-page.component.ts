import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { ConfirmDialogService } from "../../../../shared/confirm-dialog/confirm-dialog.service";
import { CertificateTemplate } from "../../data/certificate-page-response";
import { CertificateRequest } from "../../data/certificate-request";
import { CertificatesApi } from "../../data/certificates.api";
import { ClassicThumbnailComponent } from "../../ui/template-thumbnail/classic-thumbnail.component";
import { MinimalThumbnailComponent } from "../../ui/template-thumbnail/minimal-thumbnail.component";
import { ModernThumbnailComponent } from "../../ui/template-thumbnail/modern-thumbnail.component";

const TEMPLATES: CertificateTemplate[] = ["CLASSIC", "MODERN", "MINIMAL"];

/** Title case for the screen; the values themselves stay the API's uppercase enum. */
/** Both axes, so the group behaves the same however the cards happen to wrap. */
const TEMPLATE_KEY_OFFSETS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

const TEMPLATE_LABELS: Record<CertificateTemplate, string> = {
  CLASSIC: "Classic",
  MODERN: "Modern",
  MINIMAL: "Minimal",
};

@Component({
  selector: "app-certificate-form-page",
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ClassicThumbnailComponent,
    ModernThumbnailComponent,
    MinimalThumbnailComponent,
  ],
  templateUrl: "./certificate-form-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateFormPageComponent {
  private readonly certificatesApi = inject(CertificatesApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly templates = TEMPLATES;
  protected readonly templateLabels = TEMPLATE_LABELS;
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

  /** Raised only by a submit the client-side validators blocked, so it never precedes a try. */
  protected readonly showValidationSummary = signal(false);

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

  protected isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return control !== null && control.invalid && control.touched;
  }

  /** A server field error replaces the client message; otherwise the field's own copy stands. */
  protected errorFor(field: string, fallback: string): string {
    const server = this.form.get(field)?.errors?.["server"];
    return typeof server === "string" ? server : fallback;
  }

  protected selectTemplate(template: CertificateTemplate): void {
    this.form.controls.template.setValue(template);
  }

  /**
   * A radio group is one tab stop: only the selected card is reachable by Tab, and the arrows
   * move between them. Without this the three cards would be three stops, which is what the
   * `role="radiogroup"` on the container promises they are not.
   */
  protected tabIndexFor(template: CertificateTemplate): number {
    return this.form.controls.template.value === template ? 0 : -1;
  }

  protected onTemplateKeydown(event: KeyboardEvent): void {
    // Ctrl/Alt/Meta + arrow belongs to the OS and the browser, not to this group.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    const current = this.templates.indexOf(this.form.controls.template.value);
    const target = this.templateForKey(event.key, current);
    if (!target) {
      return;
    }
    event.preventDefault();
    this.selectTemplate(target);

    // Found by identity rather than by index: a wrapper added around the cards, or a reordering
    // of `templates`, would otherwise move the selection and the focus to two different cards.
    const group = (event.currentTarget as HTMLElement).closest("[role='radiogroup']");
    group?.querySelector<HTMLElement>(`[data-template="${target}"]`)?.focus();
  }

  private templateForKey(key: string, current: number): CertificateTemplate | undefined {
    const { length } = this.templates;
    if (key === "Home") {
      return this.templates[0];
    }
    if (key === "End") {
      return this.templates[length - 1];
    }
    const offset = TEMPLATE_KEY_OFFSETS[key];
    return offset === undefined ? undefined : this.templates[(current + offset + length) % length];
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showValidationSummary.set(true);
      return;
    }
    this.showValidationSummary.set(false);

    const values = this.form.getRawValue();
    if (values.workloadHours === null) {
      return;
    }

    this.submitError.set(null);
    this.submitting.set(true);
    const request: CertificateRequest = { ...values, workloadHours: values.workloadHours };
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

    this.confirmDialog
      .confirm({
        title: "Delete certificate",
        message: "Delete this certificate? This cannot be undone.",
        confirmLabel: "Delete",
        destructive: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
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
        control?.markAsTouched();
      }
      return;
    }
    this.submitError.set(problem.detail ?? "Something went wrong. Please try again.");
  }
}
