import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, Observable, tap } from "rxjs";
import { API_BASE_URL } from "../config/api.config";
import { TokenPairResponse } from "../http/token-pair-response";
import { AuthRefreshCoordinatorService } from "./auth-refresh-coordinator.service";
import { TokenStorageService } from "./token-storage.service";

const REFRESH_PATH = "/api/v1/auth/refresh";

/**
 * The single place that actually calls POST /api/v1/auth/refresh, shared by every caller
 * (authRefreshInterceptor's 401 retry, authGuard's reload-recovery branch, and anything else that
 * needs a fresh access token) via AuthRefreshCoordinatorService. A caller that built its own HTTP
 * call instead of going through here would bypass the single-flight dedup and could present an
 * already-used refresh token to the backend, which reads as theft and revokes the whole session
 * — this is deliberately the only place `POST .../auth/refresh` is ever called from.
 */
@Injectable({ providedIn: "root" })
export class TokenRefreshService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly coordinator = inject(AuthRefreshCoordinatorService);

  refresh(): Observable<string> {
    return this.coordinator.coordinate(() => this.performRefresh());
  }

  private performRefresh(): Observable<string> {
    const refreshToken = this.tokenStorage.refreshToken;
    return this.http.post<TokenPairResponse>(`${this.apiBaseUrl}${REFRESH_PATH}`, { refreshToken }).pipe(
      tap((response) => this.tokenStorage.setTokens(response.accessToken, response.refreshToken)),
      map((response) => response.accessToken),
    );
  }
}
