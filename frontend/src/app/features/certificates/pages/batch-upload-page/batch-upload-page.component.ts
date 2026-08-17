import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTableModule } from "@angular/material/table";
import { finalize } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { BatchImportResponse, BatchRowError } from "../../data/batch-import-response";
import { CertificatesApi } from "../../data/certificates.api";

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // See certificate-list-page.component.ts's downloadPdf() for why the anchor is attached to the
  // DOM and the object URL revoke is deferred rather than immediate.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

@Component({
  selector: "app-batch-upload-page",
  imports: [MatButtonModule, MatProgressSpinnerModule, MatTableModule],
  templateUrl: "./batch-upload-page.component.html",
  styleUrl: "./batch-upload-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchUploadPageComponent {
  private readonly certificatesApi = inject(CertificatesApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly displayedColumns = ["line", "reason"];

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploading = signal(false);
  protected readonly result = signal<BatchImportResponse | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly sortedErrors = computed<BatchRowError[]>(() =>
    [...(this.result()?.errors ?? [])].sort((a, b) => a.line - b.line),
  );

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  protected upload(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.error.set(null);
    this.uploading.set(true);
    this.certificatesApi
      .uploadBatch(file)
      .pipe(
        finalize(() => this.uploading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => this.result.set(response),
        error: (err: unknown) => {
          const problem = toProblemDetail(err);
          this.error.set(problem.detail ?? "Could not upload this file. Please try again.");
        },
      });
  }

  protected reset(): void {
    this.selectedFile.set(null);
    this.result.set(null);
    this.error.set(null);
  }

  protected downloadTemplate(): void {
    this.certificatesApi
      .downloadTemplate()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((blob) => saveBlob(blob, "certificate-batch-template.csv"));
  }
}
