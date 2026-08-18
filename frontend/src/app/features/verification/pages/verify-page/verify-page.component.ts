import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal } from "@angular/core";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { VerificationApi } from "../../data/verification.api";
import { CERTIFICATE_CODE_LENGTH, CERTIFICATE_CODE_PATTERN } from "../../data/certificate-code";

@Component({
  selector: "app-verify-page",
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./verify-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyPageComponent {
  private readonly verificationApi = inject(VerificationApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly maxLength = CERTIFICATE_CODE_LENGTH;

  // Reactive rather than a constructor-time route.snapshot read: this page has no in-app
  // navigation guiding it, so a hand-typed code corrected and re-submitted without a full reload
  // is a real case here (see design.md — the same shortcut was left as a documented, narrower-risk
  // tradeoff on certificate-form, but doesn't hold for a public page like this one).
  private readonly rawCode = toSignal(
    this.route.paramMap.pipe(map((params) => params.get("code") ?? "")),
    { initialValue: "" },
  );

  /** A shared link may carry any case; the codes themselves are upper case. */
  protected readonly code = computed(() => this.rawCode().trim().toUpperCase());

  /** A code in the URL that cannot be a code is a typo, not a missing certificate. */
  protected readonly urlCodeMalformed = computed(
    () => this.code().length > 0 && !CERTIFICATE_CODE_PATTERN.test(this.code()),
  );

  protected readonly control = new FormControl("", { nonNullable: true });

  /** Cleared as soon as the visitor edits the field: leaving `aria-invalid` set while they type a
   * correct code reports the control as invalid for input that is not. */
  private readonly typed = toSignal(this.control.valueChanges, { initialValue: "" });
  protected readonly showFormatError = linkedSignal({
    source: () => ({ code: this.code(), typed: this.typed() }),
    computation: () => false,
  });

  private readonly verifyResource = rxResource({
    // Nothing to look up until a well-formed code is in the URL: `/verify` and `/verify/nonsense`
    // must not reach the API at all.
    params: () => (this.code() && !this.urlCodeMalformed() ? { code: this.code() } : undefined),
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
    // The field follows the URL, including back and forward between two codes — seeding it once
    // would leave the text of one lookup beside the result of another.
    // `emitEvent: false` so following the route does not look like the visitor typing.
    effect(() => this.control.setValue(this.code(), { emitEvent: false }));
  }

  /** The result stays linkable: submitting navigates rather than fetching in place. */
  protected submit(): void {
    const candidate = this.control.value.trim().toUpperCase();
    if (!CERTIFICATE_CODE_PATTERN.test(candidate)) {
      this.showFormatError.set(true);
      return;
    }
    this.showFormatError.set(false);
    if (candidate === this.code()) {
      // Same code: navigating changes nothing, so re-run the lookup instead of going quiet.
      this.verifyResource.reload();
      return;
    }
    void this.router.navigate(["/verify", candidate]);
  }

  protected retry(): void {
    this.verifyResource.reload();
  }
}
