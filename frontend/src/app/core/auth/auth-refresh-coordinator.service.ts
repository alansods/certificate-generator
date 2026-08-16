import { Injectable } from "@angular/core";
import { finalize, Observable, shareReplay } from "rxjs";

/**
 * Ensures concurrent 401s share exactly one in-flight refresh call instead of each starting its
 * own. Necessary, not just an optimization: the backend revokes a refresh token the moment it's
 * used and treats a second presentation of the same (now-revoked) token as theft, revoking every
 * refresh token belonging to the user. Two interceptor instances racing to refresh with the same
 * stale token — undeduplicated — would kill the whole session on a single expired-token event.
 */
@Injectable({ providedIn: "root" })
export class AuthRefreshCoordinatorService {
  private inFlight$: Observable<string> | null = null;

  coordinate(startRefresh: () => Observable<string>): Observable<string> {
    if (this.inFlight$) {
      return this.inFlight$;
    }

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
