import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from "@angular/core";
import { rxResource, takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from "@angular/cdk/menu";
import { RouterLink } from "@angular/router";
import { debounceTime, distinctUntilChanged } from "rxjs";
import { TokenStorageService } from "../../../../core/auth/token-storage.service";
import { ConfirmDialogService } from "../../../../shared/confirm-dialog/confirm-dialog.service";
import { ToastService } from "../../../../shared/toast/toast.service";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { CertificateResponse } from "../../data/certificate-page-response";
import { CertificatesApi } from "../../data/certificates.api";

const PAGE_SIZES = [10, 20, 50];

@Component({
  selector: "app-certificate-list-page",
  imports: [ReactiveFormsModule, RouterLink, CdkMenu, CdkMenuItem, CdkMenuTrigger],
  templateUrl: "./certificate-list-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateListPageComponent {
  private readonly certificatesApi = inject(CertificatesApi);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSizes = PAGE_SIZES;
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5];

  protected readonly searchControl = new FormControl("", { nonNullable: true });
  protected readonly query = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: "" },
  );

  protected readonly page = signal(0);

  /**
   * A reactive control rather than `[value]` on the `<select>`: the options are rendered by `@for`,
   * so a plain value binding is applied before they exist and the browser falls back to the first
   * one — the control then showed 10 while the request asked for 20.
   */
  protected readonly pageSizeControl = new FormControl("20", { nonNullable: true });
  private readonly pageSizeValue = toSignal(this.pageSizeControl.valueChanges, {
    initialValue: "20",
  });
  protected readonly pageSize = computed(() => Number(this.pageSizeValue()));

  // A search narrowing the result set while on page 2+ can otherwise leave `page` pointing past
  // the end of the new results, silently rendering an empty/short table instead of jumping back.
  private readonly resetPageOnSearch = effect(() => {
    this.query();
    this.page.set(0);
  });

  // Same reason: a smaller page size while on page 5 would otherwise point past the end.
  private readonly resetPageOnPageSize = effect(() => {
    this.pageSizeValue();
    this.page.set(0);
  });

  protected readonly isAdmin = computed(() => this.tokenStorage.role() === "ADMIN");

  private readonly listResource = rxResource({
    params: () => ({
      page: this.page(),
      size: this.pageSize(),
      q: this.query(),
      status: null,
    }),
    stream: ({ params }) => this.certificatesApi.list(params),
  });

  protected readonly certificates = computed(() =>
    this.listResource.hasValue() ? (this.listResource.value()?.content ?? []) : [],
  );
  protected readonly totalElements = computed(() =>
    this.listResource.hasValue() ? (this.listResource.value()?.page.totalElements ?? 0) : 0,
  );
  protected readonly isLoading = this.listResource.isLoading;
  protected readonly loadError = this.listResource.error;

  protected readonly traceId = computed(() => {
    const error = this.loadError();
    return error ? (toProblemDetail(error).traceId ?? null) : null;
  });

  // Deleting the last row of a page, or reloading straight into a page past the end, answers with
  // an empty page while the dataset itself is not empty. Step back to the last real page rather
  // than rendering "No certificates yet" over a list that still has rows.
  private readonly clampPagePastTheEnd = effect(() => {
    if (!this.listResource.hasValue()) {
      return;
    }
    const total = this.totalElements();
    // An emptied dataset has no populated page to step back to, so page 0 is the last one.
    const lastPage = total === 0 ? 0 : Math.ceil(total / this.pageSize()) - 1;
    if (this.page() > lastPage) {
      this.page.set(lastPage);
    }
  });

  protected readonly hasQuery = computed(() => this.query().trim().length > 0);
  // `totalElements` guards the transient window where a page past the end has already answered
  // empty but `clampPagePastTheEnd` has not yet re-fetched.
  protected readonly isEmpty = computed(
    () =>
      !this.isLoading() &&
      !this.loadError() &&
      this.certificates().length === 0 &&
      this.totalElements() === 0,
  );

  protected readonly rangeLabel = computed(() => {
    const total = this.totalElements();
    if (total === 0) {
      return "0 of 0";
    }
    const first = this.page() * this.pageSize() + 1;
    const last = Math.min(first + this.certificates().length - 1, total);
    return `${first}–${last} of ${total}`;
  });

  protected readonly isFirstPage = computed(() => this.page() === 0);
  protected readonly isLastPage = computed(
    () => (this.page() + 1) * this.pageSize() >= this.totalElements(),
  );

  protected previousPage(): void {
    this.page.update((page) => Math.max(0, page - 1));
  }

  protected nextPage(): void {
    if (!this.isLastPage()) {
      this.page.update((page) => page + 1);
    }
  }

  protected clearSearch(): void {
    this.searchControl.setValue("");
  }

  protected retry(): void {
    this.listResource.reload();
  }

  protected downloadPdf(certificate: CertificateResponse): void {
    this.certificatesApi
      .downloadPdf(certificate.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${certificate.code}.pdf`;
          // Appended to the DOM (some browsers only reliably fire a download for an attached
          // anchor) and the object URL is revoked on a deferred tick, not synchronously — click()
          // triggering a blob download is asynchronous in some browsers, so revoking immediately
          // can race the download and intermittently produce a broken/empty file.
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 0);
        },
        error: () => this.toast.error(`Could not download ${certificate.code}.`),
      });
  }

  protected confirmDelete(certificate: CertificateResponse): void {
    this.confirmDialog
      .confirm({
        title: "Delete certificate",
        message: `Delete certificate ${certificate.code} for ${certificate.recipientName}? This cannot be undone.`,
        confirmLabel: "Delete",
        destructive: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.certificatesApi
          .deleteById(certificate.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.success(`Certificate ${certificate.code} deleted.`);
              this.listResource.reload();
            },
            error: () => this.toast.error(`Could not delete ${certificate.code}.`),
          });
      });
  }
}
