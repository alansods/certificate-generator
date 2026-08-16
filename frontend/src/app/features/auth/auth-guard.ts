import { inject } from "@angular/core";
import { CanActivateFn, Router, UrlTree } from "@angular/router";
import { catchError, map, Observable, of } from "rxjs";
import { TokenStorageService } from "../../core/auth/token-storage.service";
import { AuthApi } from "./data/auth.api";

/**
 * The access token is deliberately memory-only (frontend-shell design.md), so every hard reload
 * of an otherwise-still-logged-in user looks like "no session" until proven otherwise here — the
 * middle branch below is what stops that from bouncing a valid session to /login on every reload.
 */
export const authGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const tokenStorage = inject(TokenStorageService);
  const authApi = inject(AuthApi);
  const router = inject(Router);

  if (tokenStorage.accessToken()) {
    return true;
  }

  if (!tokenStorage.refreshToken) {
    return router.createUrlTree(["/login"]);
  }

  return authApi.refresh().pipe(
    map(() => true),
    catchError(() => {
      tokenStorage.clear();
      return of(router.createUrlTree(["/login"]));
    }),
  );
};
