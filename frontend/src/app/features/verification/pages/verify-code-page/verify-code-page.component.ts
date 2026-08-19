import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";
import { map } from "rxjs";
import { createVerificationLookup } from "../../data/verification-lookup";
import { VerificationApi } from "../../data/verification.api";
import { CodeFieldComponent } from "../../ui/code-field/code-field.component";
import { VerificationResultComponent } from "../../ui/verification-result/verification-result.component";

/**
 * The same lookup a recipient gets, inside the authenticated shell, so an operator checking a code
 * does not have to open the public page in another tab. It uses the public endpoint deliberately
 * (see design.md): duplicating the projection would split the rate-limiting story for no gain.
 */
@Component({
  selector: "app-verify-code-page",
  imports: [CodeFieldComponent, VerificationResultComponent],
  templateUrl: "./verify-code-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyCodePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** The top bar hands a code over as a query parameter rather than making the user retype it. */
  protected readonly lookup = createVerificationLookup({
    api: inject(VerificationApi),
    routeCode: toSignal(
      this.route.queryParamMap.pipe(map((params) => params.get("code") ?? "")),
      { initialValue: "" },
    ),
  });

  protected submit(): void {
    const code = this.lookup.submit();
    if (code) {
      // Keeps the lookup linkable and the back button meaningful inside the shell.
      this.router
        .navigate([], { relativeTo: this.route, queryParams: { code } })
        .catch(() => undefined);
    }
  }
}
