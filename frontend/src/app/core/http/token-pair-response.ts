/** Shape returned by POST /api/v1/auth/login and POST /api/v1/auth/refresh (docs/api-reference.md). */
export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
