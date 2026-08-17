import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { finalize, map, switchMap } from "rxjs";
import { CertificatesApi } from "../../data/certificates.api";

@Component({
  selector: "app-certificate-preview-page",
  imports: [MatButtonModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: "./certificate-preview-page.component.html",
  styleUrl: "./certificate-preview-page.component.scss",
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
  protected readonly code = signal<string | null>(null);
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
            .pipe(map((blob) => ({ code: certificate.code, blob }))),
        ),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ code, blob }) => {
          this.code.set(code);
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
