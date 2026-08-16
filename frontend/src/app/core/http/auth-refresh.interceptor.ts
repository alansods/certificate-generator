import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, switchMap, throwError } from "rxjs";
import { TokenRefreshService } from "../auth/token-refresh.service";
import { TokenStorageService } from "../auth/token-storage.service";
import { matchesApiPath } from "../config/api.config";

const REFRESH_PATH = "/api/v1/auth/refresh";

/**
 * On a 401 from a protected request: attempt exactly one silent refresh (deduplicated by
 * TokenRefreshService, shared with authGuard's own refresh calls), then retry the original
 * request. A 401 from the refresh call itself, or a missing refresh token, ends the session
 * instead of retrying — see design.md ("Auth interceptor pair").
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);
  const tokenRefresh = inject(TokenRefreshService);

  const isRefreshRequest = matchesApiPath(req.url, REFRESH_PATH);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isRefreshRequest) {
        return throwError(() => error);
      }

      if (!tokenStorage.refreshToken) {
        tokenStorage.clear();
        void router.navigateByUrl("/login");
        return throwError(() => error);
      }

      return tokenRefresh.refresh().pipe(
        switchMap((accessToken) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })),
        ),
        catchError((refreshError: unknown) => {
          tokenStorage.clear();
          void router.navigateByUrl("/login");
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
