import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, Observable, tap } from "rxjs";
import { TokenRefreshService } from "../../../core/auth/token-refresh.service";
import { TokenStorageService } from "../../../core/auth/token-storage.service";
import { API_BASE_URL } from "../../../core/config/api.config";
import { TokenPairResponse } from "../../../core/http/token-pair-response";

@Injectable({ providedIn: "root" })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly tokenRefresh = inject(TokenRefreshService);

  login(email: string, password: string): Observable<void> {
    return this.http
      .post<TokenPairResponse>(`${this.apiBaseUrl}/api/v1/auth/login`, { email, password })
      .pipe(
        tap((response) => this.tokenStorage.setTokens(response.accessToken, response.refreshToken)),
        map(() => undefined),
      );
  }

  /** Delegates to TokenRefreshService so this shares the same single-flight dedup as the 401 retry interceptor. */
  refresh(): Observable<void> {
    return this.tokenRefresh.refresh().pipe(map(() => undefined));
  }
}
