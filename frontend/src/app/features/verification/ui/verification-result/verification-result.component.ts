import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { CertificateVerificationResponse } from "../../data/certificate-verification-response";

/** The lookup outcome, shared by the public page and the in-app one so the two cannot drift in
 * what "valid", "revoked" or "rate limited" looks like. Presentational: it fetches nothing. */
@Component({
  selector: "app-verification-result",
  templateUrl: "./verification-result.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationResultComponent {
  readonly code = input.required<string>();
  readonly loading = input(false);
  readonly errorKind = input<"not-found" | "rate-limited" | "generic" | null>(null);
  readonly certificate = input<CertificateVerificationResponse | undefined>(undefined);

  readonly retry = output<void>();
}
