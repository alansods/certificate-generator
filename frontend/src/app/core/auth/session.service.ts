import { inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, finalize, of, Subscription } from "rxjs";
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

  /**
   * Bumped on every sign-out. An in-flight `/me` that resolves afterwards belongs to a session
   * that no longer exists, and applying it would put one user's name and role on screen for the
   * next person to sign in on the same machine.
   */
  private generation = 0;
  private loading = false;
  private inFlight: Subscription | null = null;

  readonly currentUser = this.currentUserSignal.asReadonly();

  /**
   * A failed lookup must not block the shell: the navigation still renders and sign-out stays
   * available, because a user whose session is half-broken is precisely the one who needs it.
   */
  load(): void {
    // Once per session, not once per shell construction: re-entering the shell must not re-fetch,
    // and a failed re-fetch must never blank out an identity that is already on screen.
    if (this.loading || this.currentUserSignal() !== null) {
      return;
    }
    this.loading = true;
    const generation = this.generation;
    this.inFlight = this.authApi
      .me()
      .pipe(
        catchError(() => of(null)),
        finalize(() => (this.loading = false)),
      )
      .subscribe((user) => {
        if (generation === this.generation && user !== null) {
          this.currentUserSignal.set(user);
        }
      });
  }

  /**
   * Signs out locally first, then asks the server to revoke. Waiting for the response would mean
   * a request that hangs rather than fails — a cold start, a captive portal, a stalled connection
   * — leaves the user sitting on the authenticated shell with both tokens intact and no feedback.
   * The revocation still goes out; it just no longer gates the local sign-out.
   */
  signOut(): void {
    const refreshToken = this.tokenStorage.refreshToken;
    this.finishSignOut();
    if (!refreshToken) {
      return;
    }
    this.authApi
      .logout(refreshToken)
      .pipe(catchError(() => of(undefined)))
      .subscribe();
  }

  private finishSignOut(): void {
    // Cleared before navigating, so even a navigation that never completes leaves a signed-out
    // state rather than an apparently-signed-in one.
    this.generation += 1;
    // Cancelled, not merely ignored: left open, a previous session's lookup can 401 after the next
    // user signs in on this tab, and the refresh interceptor would clear *their* tokens and bounce
    // them to the login screen. It would also leave `loading` set, so their own lookup never runs.
    this.inFlight?.unsubscribe();
    this.inFlight = null;
    this.loading = false;
    this.currentUserSignal.set(null);
    this.tokenStorage.clear();
    // A rejected navigation (a guard throwing, say) must not surface as an unhandled rejection:
    // the session is already gone, and there is nothing useful left to do about it.
    this.router.navigateByUrl("/login").catch(() => undefined);
  }
}
