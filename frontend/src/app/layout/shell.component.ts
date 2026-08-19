import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { SessionService } from "../core/auth/session.service";
import { CERTIFICATE_CODE_LENGTH } from "../features/verification/data/certificate-code";

/** Authenticated-area chrome: top bar with a quick code lookup, side navigation, and the
 * signed-in identity with sign-out pinned to the bottom. */
@Component({
  selector: "app-shell",
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: "./shell.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly maxLength = CERTIFICATE_CODE_LENGTH;
  protected readonly quickCode = new FormControl("", { nonNullable: true });

  protected readonly currentUser = this.session.currentUser;

  protected readonly initials = computed(() => {
    const name = this.currentUser()?.fullName?.trim();
    if (!name) {
      return null;
    }
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase();
  });

  ngOnInit(): void {
    this.session.load();
  }

  /** Hands the code to the in-app lookup rather than checking it here: one page owns the states. */
  protected quickVerify(): void {
    const code = this.quickCode.value.trim().toUpperCase();
    if (!code) {
      return;
    }
    this.router.navigate(["/verify-code"], { queryParams: { code } }).catch(() => undefined);
    this.quickCode.setValue("");
  }

  protected signOut(): void {
    this.session.signOut();
  }
}
