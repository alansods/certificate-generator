import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { finalize, map, switchMap } from "rxjs";
import { CertificateResponse } from "../../data/certificate-page-response";
import { CertificatesApi } from "../../data/certificates.api";

@Component({
  selector: "app-certificate-preview-page",
  imports: [RouterLink],
  templateUrl: "./certificate-preview-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificatePreviewPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly certificatesApi = inject(CertificatesApi);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  // Snapshot rather than reactive: same tradeoff already made (and documented) by
  // certificate-form-page.component.ts — this route is only ever reached from the list page's
  // per-row link, a different route config, so navigating between two preview pages back-to-back
  // without a full route destroy isn't a real case today.
  protected readonly certificateId = Number(this.route.snapshot.paramMap.get("id"));

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  /** The whole certificate, so the header can name what is being previewed, not just its code. */
  protected readonly certificate = signal<CertificateResponse | null>(null);
  protected readonly code = computed(() => this.certificate()?.code ?? null);
  /** Title case for the screen; the stored value stays the API's uppercase enum. */
  protected readonly templateLabel = computed(() => {
    const template = this.certificate()?.template;
    return template ? template.charAt(0) + template.slice(1).toLowerCase() : null;
  });
  protected readonly pdfUrl = signal<SafeResourceUrl | null>(null);

  private blob: Blob | null = null;
  private objectUrl: string | null = null;

  constructor() {
    this.certificatesApi
      .get(this.certificateId)
      .pipe(
        switchMap((certificate) =>
          this.certificatesApi
            .downloadPdf(this.certificateId)
            .pipe(map((blob) => ({ certificate, blob }))),
        ),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ certificate, blob }) => {
          this.certificate.set(certificate);
          this.blob = blob;
          this.objectUrl = URL.createObjectURL(blob);
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
        },
        error: () => this.error.set(true),
      });

    this.destroyRef.onDestroy(() => {
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
      }
    });
  }

  protected download(): void {
    if (!this.blob) {
      return;
    }
    const url = URL.createObjectURL(this.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${this.code() ?? this.certificateId}.pdf`;
    // Same deferred-revoke pattern as certificate-list-page.component.ts's downloadPdf() — a
    // separate object URL from the one backing the inline preview, so leaving this page right
    // after downloading can't revoke a URL the download itself still needs.
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
