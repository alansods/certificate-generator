## 1. Container build

- [x] 1.1 `backend/Dockerfile`: multi-stage — Maven/Temurin 21 build stage (dependency layer cached separately from source), `eclipse-temurin:21-jre-alpine` runtime stage, non-root user, `ENTRYPOINT` running the built jar.
- [x] 1.2 `backend/.dockerignore`: excludes `target/`, `.git`, IDE files, so the build context stays small and the build stage's own `target/` doesn't leak into the image.
- [x] 1.3 Local verification: `docker build` succeeds and the resulting image starts (against a local Postgres or Testcontainers-style throwaway DB) and answers `GET /actuator/health` with 200.

## 2. Render configuration

- [x] 2.1 `backend/render.yaml`: web service from `backend/Dockerfile`, free plan, health check path `/actuator/health`, `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=70`, and every environment variable `application-prod.yml` reads declared as `sync: false` (value supplied later by the owner in the Render dashboard, never in this file).
- [x] 2.2 Confirm no variable `application-prod.yml`/`CorsConfig` reads is missing from the blueprint's declared list.

## 3. Documentation

- [x] 3.1 `docs/deployment.md`: Neon project/connection-string steps, Render service/blueprint steps, `JWT_SECRET` generation command, environment variable reference table, and an explicit note that `APP_CORS_ALLOWED_ORIGINS`/`APP_FRONTEND_BASE_URL` stay unset until 3.3.

## 4. Verification

- [x] 4.1 `cd backend && ./mvnw verify` still passes (no application code changed).
- [x] 4.2 `openspec validate deploy-render-neon --type change --strict` passes.
