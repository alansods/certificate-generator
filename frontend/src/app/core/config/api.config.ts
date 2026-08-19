import { InjectionToken } from "@angular/core";
import { environment } from "../../../environments/environment";

/** Base URL every `*.api.ts` service builds its request paths from. */
export const API_BASE_URL = new InjectionToken<string>("API_BASE_URL", {
  providedIn: "root",
  factory: () => environment.apiBaseUrl,
});

/** Paths that must never carry an Authorization header. */
export const PUBLIC_API_PATHS = [
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  // Logout carries its credential — the refresh token — in the body. Keeping it out of the
  // bearer path also keeps it out of the 401 retry, which would otherwise re-send the original
  // body after a rotation and revoke a token that is already dead.
  "/api/v1/auth/logout",
  "/api/v1/public/verify/",
];

/**
 * Matches by URL *pathname*, not a raw substring of the whole URL — a substring check could be
 * fooled by a future request that embeds user-controlled text (e.g. a search query parameter)
 * containing one of these path strings, either dropping a bearer token that should have been
 * attached or attaching one that shouldn't be.
 */
export function matchesApiPath(url: string, path: string): boolean {
  return new URL(url, "http://placeholder.invalid").pathname.startsWith(path);
}
