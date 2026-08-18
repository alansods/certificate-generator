import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal } from "@angular/core";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { map } from "rxjs";
import { toProblemDetail } from "../../../../core/http/problem-detail";
import { CERTIFICATE_CODE_LENGTH, CERTIFICATE_CODE_PATTERN } from "../../data/certificate-code";
import { VerificationApi } from "../../data/verification.api";
import { VerificationResultComponent } from "../../ui/verification-result/verification-result.component";

/**
 * The same lookup a recipient gets, inside the authenticated shell, so an operator checking a code
 * does not have to open the public page in another tab. It uses the public endpoint deliberately
 * (see design.md): duplicating the projection would split the rate-limiting story for no gain.
 */
@Component({
  selector: "app-verify-code-page",
  imports: [ReactiveFormsModule, VerificationResultComponent],
  templateUrl: "./verify-code-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyCodePageComponent {
  private readonly verificationApi = inject(VerificationApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly maxLength = CERTIFICATE_CODE_LENGTH;

  /** The top bar hands a code over as a query parameter rather than making the user retype it. */
  private readonly queryCode = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get("code") ?? "")),
    { initialValue: "" },
  );

  protected readonly code = computed(() => this.queryCode().trim().toUpperCase());

  protected readonly urlCodeMalformed = computed(
    () => this.code().length > 0 && !CERTIFICATE_CODE_PATTERN.test(this.code()),
  );

  protected readonly control = new FormControl("", { nonNullable: true });

  private readonly typed = toSignal(this.control.valueChanges, { initialValue: "" });
  protected readonly showFormatError = linkedSignal({
    source: () => ({ code: this.code(), typed: this.typed() }),
    computation: () => false,
  });

  private readonly verifyResource = rxResource({
    params: () => (this.code() && !this.urlCodeMalformed() ? { code: this.code() } : undefined),
    stream: ({ params }) => this.verificationApi.verify(params.code),
  });

  protected readonly certificate = computed(() =>
    this.verifyResource.hasValue() ? this.verifyResource.value() : undefined,
  );
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

  constructor() {
    effect(() => this.control.setValue(this.code(), { emitEvent: false }));
  }

  protected submit(): void {
    const candidate = this.control.value.trim().toUpperCase();
    if (!CERTIFICATE_CODE_PATTERN.test(candidate)) {
      this.showFormatError.set(true);
      return;
    }
    this.showFormatError.set(false);
    if (candidate === this.code()) {
      this.verifyResource.reload();
      return;
    }
    // Keeps the lookup linkable and the back button meaningful inside the shell.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { code: candidate },
    });
  }

  protected retry(): void {
    this.verifyResource.reload();
  }
}
