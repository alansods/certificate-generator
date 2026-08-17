import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from "@angular/core";
import { rxResource, takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatTableModule } from "@angular/material/table";
import { debounceTime, distinctUntilChanged } from "rxjs";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { ConfirmDialogComponent } from "../../../../shared/confirm-dialog.component";
import { CertificateResponse, CertificateStatus } from "../../data/certificate-page-response";
import { CertificatesApi } from "../../data/certificates.api";

const STATUSES: CertificateStatus[] = ["DRAFT", "ISSUED", "REVOKED"];

@Component({
  selector: "app-certificate-list-page",
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./certificate-list-page.component.html",
  styleUrl: "./certificate-list-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateListPageComponent {
  private readonly certificatesApi = inject(CertificatesApi);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = STATUSES;
  protected readonly displayedColumns = ["code", "recipientName", "courseName", "status", "issueDate", "actions"];

  protected readonly searchControl = new FormControl("", { nonNullable: true });
  private readonly query = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: "" },
  );

  protected readonly page = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly status = signal<CertificateStatus | null>(null);

  protected readonly isAdmin = computed(() => this.tokenStorage.role() === "ADMIN");

  private readonly listResource = rxResource({
    params: () => ({
      page: this.page(),
      size: this.pageSize(),
      q: this.query(),
      status: this.status(),
    }),
    stream: ({ params }) => this.certificatesApi.list(params),
  });

  protected readonly certificates = computed(() => this.listResource.value()?.content ?? []);
  protected readonly totalElements = computed(() => this.listResource.value()?.page.totalElements ?? 0);
  protected readonly isLoading = this.listResource.isLoading;
  protected readonly loadError = this.listResource.error;

  protected onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected onStatusChange(value: CertificateStatus | ""): void {
    this.status.set(value === "" ? null : value);
    this.page.set(0);
  }

  protected retry(): void {
    this.listResource.reload();
  }

  protected downloadPdf(certificate: CertificateResponse): void {
    this.certificatesApi
      .downloadPdf(certificate.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${certificate.code}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      });
  }

  protected confirmDelete(certificate: CertificateResponse): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: "Delete certificate",
          message: `Delete certificate ${certificate.code} for ${certificate.recipientName}? This cannot be undone.`,
          confirmLabel: "Delete",
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean | undefined) => {
        if (confirmed) {
          this.certificatesApi
            .deleteById(certificate.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.listResource.reload());
        }
      });
  }
}
