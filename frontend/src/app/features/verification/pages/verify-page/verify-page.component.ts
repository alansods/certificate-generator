import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { VerificationApi } from "../../data/verification.api";
import { CERTIFICATE_CODE_PATTERN } from "../../data/certificate-code";

@Component({
  selector: "app-verify-page",
  imports: [RouterLink],
  templateUrl: "./verify-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyPageComponent {
  private readonly verificationApi = inject(VerificationApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Reactive rather than a constructor-time route.snapshot read: this page has no in-app
  // navigation guiding it, so a hand-typed code corrected and re-submitted without a full reload
  // is a real case here (see design.md — the same shortcut was left as a documented, narrower-risk
  // tradeoff on certificate-form, but doesn't hold for a public page like this one).
  protected readonly code = toSignal(
    this.route.paramMap.pipe(map((params) => params.get("code") ?? "")),
    { initialValue: "" },
  );

  /** What the visitor is typing, seeded from the route so a shared link arrives filled in. */
  protected readonly draft = signal("");
  protected readonly showFormatError = signal(false);

  private readonly verifyResource = rxResource({
    // An empty code means nobody has asked anything yet: `/verify` must not call the API.
    params: () => (this.code() ? { code: this.code() } : undefined),
    stream: ({ params }) => this.verificationApi.verify(params.code),
  });

  protected readonly certificate = this.verifyResource.value;
  protected readonly isLoading = this.verifyResource.isLoading;
  protected readonly hasResult = computed(() => this.code().length > 0);

  protected readonly errorKind = computed<"not-found" | "rate-limited" | "generic" | null>(() => {
    const error = this.verifyResource.error();
    if (!error) {
      return null;
    }
    const status = toProblemDetail(error).status;
    if (status === 404) {
      return "not-found";
    }
    if (status === 429) {
      return "rate-limited";
    }
    return "generic";
  });

  constructor() {
    // Seed the field from the route once the param resolves, so `/verify/:code` shows the code it
    // is checking and a correction starts from what was shared.
    this.draft.set(this.code());
  }

  protected onDraft(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value.toUpperCase());
    this.showFormatError.set(false);
  }

  /** The result stays linkable: submitting navigates rather than fetching in place. */
  protected submit(event: Event): void {
    event.preventDefault();
    const candidate = this.draft().trim().toUpperCase();
    if (!CERTIFICATE_CODE_PATTERN.test(candidate)) {
      this.showFormatError.set(true);
      return;
    }
    this.showFormatError.set(false);
    void this.router.navigate(["/verify", candidate]);
  }

  protected retry(): void {
    this.verifyResource.reload();
  }
}
