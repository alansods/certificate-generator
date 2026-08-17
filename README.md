# Certificate Generator

Course certificate generator: manage certificates, issue branded PDFs from three layout templates, import in bulk from CSV, and let anyone verify a certificate publicly by its code — no login required.

Angular 22 frontend, Spring Boot 4 backend on Java 21, PostgreSQL. Built spec-first with [OpenSpec](https://github.com/Fission-AI/OpenSpec) and reviewed by a four-agent harness on every pull request.

## What it does

- **Authenticated users** (`ADMIN`/`USER` roles) create, edit, list, search, filter, and paginate certificates.
- **PDF generation**: three Thymeleaf-rendered layouts (classic, modern, minimal), converted to PDF with OpenHTMLtoPDF, each embedding a QR code (ZXing) that links to the public verification page.
- **Batch issuing**: upload a CSV, get a per-row success/error report, download a sample template.
- **Public verification**: anyone with a certificate's code — typically by scanning the PDF's QR code — can confirm it's genuine at `/verify/{code}`, without an account. Revoked and not-yet-issued certificates are shown as such, not hidden or 404'd.
- **Delete** is `ADMIN`-only; every other authenticated action is available to both roles.

## Architecture

```
Browser
  ├─► Vercel — Angular SPA, static
  └─► Render — Spring Boot, Docker, free tier
          └─► Neon PostgreSQL, serverless, free tier
```

All three hosts are free tier, which shapes a few explicit design choices: the backend's Hikari pool is capped small to respect Neon's connection ceiling, the login page has an explicit "waking the server" state for Render's cold start (~50s after 15 minutes idle), and PDFs are generated and streamed entirely in memory since Render's free plan has no persistent disk. See `docs/PLAN.md` for the full reasoning.

## Local setup

### Backend

Needs a local PostgreSQL on `localhost:5432` (database/user/password `certificate_generator`) and Docker for the test suite's Testcontainers.

```bash
cd backend
./mvnw spring-boot:run   # dev profile, http://localhost:8080
./mvnw verify             # full test suite (95 tests)
```

The `dev` profile ships a working `JWT_SECRET` and a bootstrap admin (`admin@example.com` / `changeme123`, seeded on first run) out of the box — nothing to configure locally.

### Frontend

```bash
cd frontend
npm start                  # http://localhost:4200, proxies API calls to http://localhost:8080
npm test                   # unit tests (Vitest, headless)
npm run lint
npm run build               # production build, output at dist/frontend/browser
```

Local dev talks to the backend at `http://localhost:8080` by default (`src/environments/environment.development.ts`) — no configuration needed as long as the backend is running per the section above.

## Environment variables

Only relevant for a production deployment — every variable below has a working default in the `dev` profile. See `docs/deployment.md` for the full Neon/Render/Vercel setup runbook these feed into.

| Variable | Where | Purpose |
|---|---|---|
| `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | backend | Neon Postgres connection |
| `JWT_SECRET` | backend | Signs access tokens. At least 32 bytes; the app fails to start otherwise. |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | backend | Seeds the first `ADMIN` user if `users` is empty. Safe to leave set permanently — no-ops once any user exists. |
| `APP_CORS_ALLOWED_ORIGINS` | backend | Comma-separated frontend origin(s). Empty means no CORS mapping is registered at all — not a wildcard. |
| `APP_FRONTEND_BASE_URL` | backend | The deployed frontend's origin — embedded in each PDF's QR code. |
| `API_BASE_URL` | frontend (Vercel build) | The deployed backend's origin. Baked into the production bundle at build time; see `frontend/scripts/write-environment.mjs`. |

## Deployment

Both hosts need a one-time manual setup (account creation, connection strings, environment variables) that can't be automated from here — see **`docs/deployment.md`** for the full runbook: Neon, Render (backend), and Vercel (frontend).

## How work happens here

Every change starts as an OpenSpec proposal (`openspec/changes/<id>/proposal.md` + `tasks.md`, and a spec delta for genuinely new capabilities), gets approved by the project owner, lands on its own branch, and goes through a four-agent review (`spec-reviewer`, `backend-reviewer` and/or `frontend-reviewer` depending on what the diff touches, `security-reviewer`) before merging and archiving. See `openspec/AGENTS.md` for the exact stages, and `openspec/specs/` for every capability's current, authoritative behavior.

## Layout

```
frontend/   Angular workspace — standalone components, signals, Angular Material
backend/    Spring Boot Maven project
openspec/   specs and changes — the source of truth for behavior
docs/       plan, style guide, API reference, testing policy, deployment runbook
.claude/    review agents and workflow commands
```

## More docs

- `docs/PLAN.md` — architecture, domain model, full task backlog, decision log
- `docs/style-guide.md` — Angular, SCSS and Java conventions
- `docs/api-reference.md` — the REST contract
- `docs/testing.md` — what "tested" means per layer
- `docs/deployment.md` — Neon/Render/Vercel setup runbook
