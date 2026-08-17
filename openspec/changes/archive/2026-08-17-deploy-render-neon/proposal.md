## Why

Backlog item 3.2 (`docs/PLAN.md`). The backend already anticipates this deploy target — `application-prod.yml` reads `SPRING_DATASOURCE_URL`/`USERNAME`/`PASSWORD`, `JWT_SECRET`, `APP_CORS_ALLOWED_ORIGINS`, and `APP_FRONTEND_BASE_URL` from the environment, `CorsConfig` only registers a mapping when an origin is configured, and the Hikari pool is already sized for Neon's free-tier connection ceiling — but there is no Dockerfile yet, so the backend cannot actually be built and run as a container on Render.

## What Changes

A multi-stage `backend/Dockerfile` (a Maven/Temurin build stage producing the jar, copied into a slim JRE-only runtime stage — keeps the shipped image free of the build toolchain), a `.dockerignore`, and `backend/render.yaml` (Render's Blueprint format) wiring the service to run `java -jar` on the built jar, reading the same environment variables `application-prod.yml` already expects. `docs/deployment.md` documents the manual steps this change cannot perform on the owner's behalf: creating the Neon project and copying its connection string, creating the Render service (or applying the blueprint) and setting its environment variables and secrets, and generating a `JWT_SECRET`.

## What This Change Does Not Do

It cannot create a Neon account, a Render account, or any external service, and it cannot enter connection strings, passwords, or API keys into any UI — per the working agreement's safety rules, those steps stay with the owner. This change delivers the files needed to deploy and a runbook for the manual steps; it does not perform an actual deployment.

## Capabilities

_None — infrastructure only, no application behavior changes. `skip_specs: true`._

## Impact

- Adds `backend/Dockerfile`, `backend/.dockerignore`, `backend/render.yaml`.
- Adds `docs/deployment.md` (Neon/Render setup runbook, environment variable reference).
- No changes to `application.yml`/`application-prod.yml`/`CorsConfig` — they already read every variable this change wires up; confirmed while drafting this proposal.
