import { Injectable } from "@angular/core";
import { finalize, Observable, shareReplay } from "rxjs";

/**
 * Ensures concurrent 401s share exactly one in-flight refresh call instead of each starting its
 * own. Necessary, not just an optimization: the backend revokes a refresh token the moment it's
 * used and treats a second presentation of the same (now-revoked) token as theft, revoking every
 * refresh token belonging to the user. Two interceptor instances racing to refresh with the same
 * stale token — undeduplicated — would kill the whole session on a single expired-token event.
 *
 * Scoped to a single browser tab: `inFlight$` is in-memory singleton state, so two tabs of the
 * same origin (sharing the same `localStorage` refresh token) can still independently race each
 * other the same way. A full fix needs the tab that wins the race to broadcast its new access
 * token to the others (e.g. via `BroadcastChannel`) rather than each tab refreshing for itself —
 * a real gap, deliberately not fixed here since it touches token storage's cross-tab story more
 * broadly than this dedup service; tracked as a follow-up rather than expanded into this change.
 */
@Injectable({ providedIn: "root" })
export class AuthRefreshCoordinatorService {
  private inFlight$: Observable<string> | null = null;

  coordinate(startRefresh: () => Observable<string>): Observable<string> {
    if (this.inFlight$) {
      return this.inFlight$;
    }

    // `finalize` must wrap the shared source (run before `shareReplay` in the pipe) so it fires
    // once when the underlying HTTP call settles, not once per subscriber — resetting `inFlight$`
    // before any later, independent 401 arrives, without disturbing concurrent subscribers still
    // waiting on this same in-flight call via shareReplay's buffered replay.
    const shared$ = startRefresh().pipe(
      finalize(() => {
        this.inFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.inFlight$ = shared$;
    return shared$;
  }
}
