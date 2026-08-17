import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import { map } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { VerificationApi } from "../../data/verification.api";

@Component({
  selector: "app-verify-page",
  templateUrl: "./verify-page.component.html",
  styleUrl: "./verify-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyPageComponent {
  private readonly verificationApi = inject(VerificationApi);
  private readonly route = inject(ActivatedRoute);

  // Reactive rather than a constructor-time route.snapshot read: this page has no in-app
  // navigation guiding it, so a hand-typed code corrected and re-submitted without a full reload
  // is a real case here (see design.md — the same shortcut was left as a documented, narrower-risk
  // tradeoff on certificate-form, but doesn't hold for a public page like this one).
  private readonly code = toSignal(
    this.route.paramMap.pipe(map((params) => params.get("code") ?? "")),
    { initialValue: "" },
  );

  private readonly verifyResource = rxResource({
    params: () => ({ code: this.code() }),
    stream: ({ params }) => this.verificationApi.verify(params.code),
  });

  protected readonly certificate = this.verifyResource.value;
  protected readonly isLoading = this.verifyResource.isLoading;

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

  protected retry(): void {
    this.verifyResource.reload();
  }
}
