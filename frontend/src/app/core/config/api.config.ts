import { InjectionToken } from "@angular/core";
import { environment } from "../../../environments/environment";

/** Base URL every `*.api.ts` service builds its request paths from. */
export const API_BASE_URL = new InjectionToken<string>("API_BASE_URL", {
  providedIn: "root",
  factory: () => environment.apiBaseUrl,
});

/** Paths that must never carry an Authorization header. */
export const PUBLIC_API_PATHS = ["/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/public/verify/"];
