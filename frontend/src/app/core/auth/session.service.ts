import { inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, finalize, of } from "rxjs";
import { AuthApi } from "../../features/auth/data/auth.api";
import { UserResponse } from "../../features/auth/data/user-response";
import { TokenStorageService } from "./token-storage.service";

/**
 * The signed-in user, held in one place so the navigation, the profile screen and any role-gated
 * control read the same source instead of each decoding the access token.
 */
@Injectable({ providedIn: "root" })
export class SessionService {
  private readonly authApi = inject(AuthApi);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly currentUserSignal = signal<UserResponse | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();

  /**
   * A failed lookup must not block the shell: the navigation still renders and sign-out stays
   * available, because a user whose session is half-broken is precisely the one who needs it.
   */
  load(): void {
    this.authApi
      .me()
      .pipe(catchError(() => of(null)))
      .subscribe((user) => this.currentUserSignal.set(user));
  }

  /**
   * Fires the revocation first so a reachable server does revoke, then clears and navigates
   * whatever happened — a failed request must not leave an apparently-signed-in state behind.
   */
  signOut(): void {
    const refreshToken = this.tokenStorage.refreshToken;
    if (!refreshToken) {
      this.finishSignOut();
      return;
    }
    this.authApi
      .logout(refreshToken)
      .pipe(
        catchError(() => of(undefined)),
        finalize(() => this.finishSignOut()),
      )
      .subscribe();
  }

  private finishSignOut(): void {
    this.currentUserSignal.set(null);
    this.tokenStorage.clear();
    void this.router.navigateByUrl("/login");
  }
}
