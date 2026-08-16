import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { PUBLIC_API_PATHS } from "../config/api.config";
import { TokenStorageService } from "../auth/token-storage.service";

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);

  const isPublicPath = PUBLIC_API_PATHS.some((path) => req.url.includes(path));
  const accessToken = tokenStorage.accessToken();

  if (isPublicPath || !accessToken) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    }),
  );
};
