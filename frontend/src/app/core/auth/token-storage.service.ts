import { Injectable, signal } from "@angular/core";

const REFRESH_TOKEN_KEY = "certificate-generator.refreshToken";

/**
 * Access token: in-memory only (never persisted) — a 15-minute-lived JWT, so losing it on a hard
 * reload just costs one silent refresh, and keeping it out of persistent storage limits the XSS
 * blast radius to whatever's live in the current tab.
 *
 * Refresh token: `localStorage` — it must survive a hard reload or the user would be logged out
 * on every refresh, and there's no HttpOnly-cookie option without a backend change. Accepted
 * tradeoff, not an oversight — see design.md ("Token storage").
 */
@Injectable({ providedIn: "root" })
export class TokenStorageService {
  private readonly accessTokenSignal = signal<string | null>(null);

  readonly accessToken = this.accessTokenSignal.asReadonly();

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessTokenSignal.set(accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clear(): void {
    this.accessTokenSignal.set(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
