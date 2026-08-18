import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, Observable, tap } from "rxjs";
import { TokenRefreshService } from "../../../core/auth/token-refresh.service";
import { TokenStorageService } from "../../../core/auth/token-storage.service";
import { API_BASE_URL } from "../../../core/config/api.config";
import { TokenPairResponse } from "../../../core/http/token-pair-response";
import { UserResponse } from "./user-response";

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

  /** The signed-in user's own profile. The role also rides on the access token, but that claim is
   * a detail of the auth change; this is the typed endpoint for it. */
  me(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiBaseUrl}/api/v1/auth/me`);
  }

  /** Revokes the refresh token server-side. The caller clears local storage regardless of the
   * outcome — a network failure must not leave the user apparently signed in. */
  logout(refreshToken: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/api/v1/auth/logout`, { refreshToken });
  }

  /** Delegates to TokenRefreshService so this shares the same single-flight dedup as the 401 retry interceptor. */
  refresh(): Observable<void> {
    return this.tokenRefresh.refresh().pipe(map(() => undefined));
  }
}
