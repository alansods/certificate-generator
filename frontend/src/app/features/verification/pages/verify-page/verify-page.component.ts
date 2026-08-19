import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map } from "rxjs";
import { createVerificationLookup } from "../../data/verification-lookup";
import { VerificationApi } from "../../data/verification.api";
import { CodeFieldComponent } from "../../ui/code-field/code-field.component";
import { VerificationResultComponent } from "../../ui/verification-result/verification-result.component";

@Component({
  selector: "app-verify-page",
  imports: [RouterLink, CodeFieldComponent, VerificationResultComponent],
  templateUrl: "./verify-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Reactive rather than a constructor-time route.snapshot read: this page has no in-app
  // navigation guiding it, so a hand-typed code corrected and re-submitted without a full reload
  // is a real case here (see design.md).
  protected readonly lookup = createVerificationLookup({
    api: inject(VerificationApi),
    routeCode: toSignal(
      this.route.paramMap.pipe(map((params) => params.get("code") ?? "")),
      { initialValue: "" },
    ),
  });

  /** The result stays linkable: submitting navigates rather than fetching in place. */
  protected submit(): void {
    const code = this.lookup.submit();
    if (code) {
      this.router.navigate(["/verify", code]).catch(() => undefined);
    }
  }
}
