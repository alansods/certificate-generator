## Context

The backend has been deploy-aware since `feat/backend-skeleton` and `feat/jwt-auth` — `application-prod.yml`'s env-var placeholders, the Hikari pool sized for Neon's connection ceiling, and `CorsConfig`'s empty-origin-means-no-mapping default all predate this change. What's missing is purely the container build and the Render-side wiring.

## Multi-stage Dockerfile

Stage 1 (`maven:3.9-eclipse-temurin-21` or equivalent): copies `pom.xml` first and runs `./mvnw dependency:go-offline` before copying source, so Docker's layer cache holds the dependency layer across source-only changes — a full `mvn verify` here would duplicate CI and slow every image build, so this stage only packages (`./mvnw -DskipTests package`); tests already gate merges via CI, not the image build. Stage 2 (`eclipse-temurin:21-jre-alpine`, JRE-only, no JDK/Maven) copies just the built jar from stage 1. A non-root user runs the process — the default Alpine JRE image runs as root otherwise, and there's no reason this process needs it.

## Memory: explicit, not left to JVM defaults

Render's free tier caps a service at 512MB RAM. Modern JDKs are container-aware and size the default heap off cgroup limits, but that detection is a floor to rely on, not a guarantee across every container runtime — being explicit costs nothing and removes a class of "worked locally, OOM-killed on Render" failure. `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=70` in `render.yaml`'s environment leaves headroom for non-heap JVM memory (metaspace, thread stacks, direct buffers used by OpenHTMLtoPDF's in-memory PDF rendering) under that 512MB ceiling.

## Migrations run on startup, not as a separate step

Flyway is already on the classpath (`spring-boot-starter-flyway`) and Spring Boot's auto-configuration runs pending migrations against `SPRING_DATASOURCE_URL` on application startup by default — no extra migration job, Render build step, or manual `flyway migrate` invocation needed. This is the existing, default behavior; this change adds no Flyway configuration.

## render.yaml as a Blueprint, not manual-only

Render's Blueprint format (`render.yaml`) lets the owner apply this repo's service definition (Docker build from `backend/Dockerfile`, health check path `/actuator/health`, free plan) in one step from the Render dashboard instead of clicking through every field by hand. Environment variables split into two kinds in the blueprint: `sync: false` entries (`SPRING_DATASOURCE_URL/USERNAME/PASSWORD`, `JWT_SECRET`, `APP_CORS_ALLOWED_ORIGINS`, `APP_FRONTEND_BASE_URL`, `ADMIN_BOOTSTRAP_EMAIL/PASSWORD`) are declared as required but left for the owner to fill in on the Render dashboard — this change cannot and does not supply real values for any of them.

## What docs/deployment.md covers

The manual runbook: creating the Neon project and free-tier Postgres instance, copying its pooled connection string into Render's dashboard as `SPRING_DATASOURCE_URL`/`USERNAME`/`PASSWORD`, generating a `JWT_SECRET` (a random 256-bit value, e.g. `openssl rand -base64 32` — documented as a command to run locally, not something this change generates or stores), applying the `render.yaml` blueprint or creating the service by hand, and a note that `APP_CORS_ALLOWED_ORIGINS`/`APP_FRONTEND_BASE_URL` stay empty until `chore/deploy-vercel` (3.3) supplies the real Vercel origin.

## Health check endpoint

`GET /actuator/health` already exists (`management.endpoints.web.exposure.include: health`, `feat/backend-skeleton`) and returns 200 once the app and its DB connection are up — used as-is for Render's health check path, no new endpoint needed.
