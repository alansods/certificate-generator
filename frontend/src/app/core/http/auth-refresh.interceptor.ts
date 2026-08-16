import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, map, Observable, switchMap, tap, throwError } from "rxjs";
import { AuthRefreshCoordinatorService } from "../auth/auth-refresh-coordinator.service";
import { TokenStorageService } from "../auth/token-storage.service";
import { API_BASE_URL, matchesApiPath } from "../config/api.config";
import { TokenPairResponse } from "./token-pair-response";

const REFRESH_PATH = "/api/v1/auth/refresh";

/**
 * On a 401 from a protected request: attempt exactly one silent refresh (deduplicated via
 * AuthRefreshCoordinatorService), then retry the original request. A 401 from the refresh call
 * itself, or a missing refresh token, ends the session instead of retrying — see design.md
 * ("Auth interceptor pair").
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const http = inject(HttpClient);
  const router = inject(Router);
  const apiBaseUrl = inject(API_BASE_URL);
  const coordinator = inject(AuthRefreshCoordinatorService);

  const isRefreshRequest = matchesApiPath(req.url, REFRESH_PATH);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isRefreshRequest) {
        return throwError(() => error);
      }

      const refreshToken = tokenStorage.refreshToken;
      if (!refreshToken) {
        tokenStorage.clear();
        void router.navigateByUrl("/login");
        return throwError(() => error);
      }

      return coordinator
        .coordinate(() => performRefresh(http, apiBaseUrl, refreshToken, tokenStorage))
        .pipe(
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

function performRefresh(
  http: HttpClient,
  apiBaseUrl: string,
  refreshToken: string,
  tokenStorage: TokenStorageService,
): Observable<string> {
  return http.post<TokenPairResponse>(`${apiBaseUrl}${REFRESH_PATH}`, { refreshToken }).pipe(
    tap((response) => tokenStorage.setTokens(response.accessToken, response.refreshToken)),
    map((response) => response.accessToken),
  );
}
