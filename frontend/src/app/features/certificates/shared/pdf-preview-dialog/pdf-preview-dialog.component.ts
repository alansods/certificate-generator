import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { CertificatesApi } from "../../data/certificates.api";

export interface PdfPreviewDialogData {
  id: number;
  code: string;
}

@Component({
  selector: "app-pdf-preview-dialog",
  imports: [MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: "./pdf-preview-dialog.component.html",
  styleUrl: "./pdf-preview-dialog.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPreviewDialogComponent {
  protected readonly data = inject<PdfPreviewDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PdfPreviewDialogComponent>);
  private readonly certificatesApi = inject(CertificatesApi);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly pdfUrl = signal<SafeResourceUrl | null>(null);

  private blob: Blob | null = null;
  private objectUrl: string | null = null;

  constructor() {
    this.certificatesApi
      .downloadPdf(this.data.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.blob = blob;
          this.objectUrl = URL.createObjectURL(blob);
          this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });

    this.dialogRef.afterClosed().subscribe(() => {
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
    link.download = `${this.data.code}.pdf`;
    // Same deferred-revoke pattern as certificate-list-page.component.ts's downloadPdf() — a
    // separate object URL from the one backing the iframe preview, so closing the dialog
    // right after downloading can't revoke a URL the download itself still needs.
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
