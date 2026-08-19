import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { finalize } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { BatchImportResponse, BatchRowError } from "../../data/batch-import-response";
import { CertificatesApi } from "../../data/certificates.api";

/** RFC 4180: quote anything holding a comma, a quote or a newline, and double the quotes. */
function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

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
  imports: [RouterLink],
  templateUrl: "./batch-upload-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchUploadPageComponent {
  private readonly certificatesApi = inject(CertificatesApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploading = signal(false);
  /** Null while the body length is unknown, which the bar renders as indeterminate. */
  protected readonly uploadPercent = signal<number | null>(null);
  protected readonly isDragging = signal(false);
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
    this.uploadPercent.set(null);
    this.certificatesApi
      .uploadBatch(file)
      .pipe(
        finalize(() => this.uploading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (event) => {
          if (event.kind === "progress") {
            this.uploadPercent.set(event.percent);
          } else {
            this.result.set(event.response);
          }
        },
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
    this.uploadPercent.set(null);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  protected onDragLeave(): void {
    this.isDragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  /**
   * Built here rather than fetched: the failed rows are already in the response the page is
   * showing, so a round trip would only be a chance for the two to disagree.
   */
  protected downloadErrorReport(): void {
    const errors = this.sortedErrors();
    if (errors.length === 0) {
      return;
    }
    const rows = [["line", "reason"], ...errors.map((row) => [String(row.line), row.reason])];
    const csv = rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
    saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "batch-import-errors.csv");
  }

  protected downloadTemplate(): void {
    this.certificatesApi
      .downloadTemplate()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((blob) => saveBlob(blob, "certificate-batch-template.csv"));
  }
}
