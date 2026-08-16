# Certificate Generator — project plan

Angular 22 + Spring Boot (Java 21), monorepo, spec-driven with OpenSpec, reviewed by an agent harness, deployed entirely on free tiers.

## 1. Decisions

| Topic | Decision |
|---|---|
| Frontend | Angular 22, standalone components, signals, Angular Material themed with custom SCSS |
| Backend | Java 21, Spring Boot 4.1.x, Maven, Spring Security, Spring Data JPA, Flyway |
| Database | PostgreSQL on Neon, free tier |
| Auth | JWT access token + rotating refresh token, roles `ADMIN` and `USER` |
| Repository | Monorepo: `frontend/`, `backend/`, `openspec/`, `docs/`, `.github/` |
| Hosting | Vercel (frontend), Render (backend), Neon (database) |
| Process | OpenSpec change per task, one branch and one PR per change, four review agents per PR |
| Scope | CRUD, PDF download, public verification page with QR, three layout templates, CSV batch issuing |
| Language | American English across code, specs, docs and UI copy |

## 2. Architecture

```
Browser
  ├─► Vercel — Angular SPA, static
  └─► Render — Spring Boot, Docker, free tier
          └─► Neon PostgreSQL, serverless, free tier
```

Free-tier constraints that shape the design:

- Render free sleeps after ~15 minutes idle; the next request takes around 50 seconds. The login screen must show an explicit "waking the server" state, not a silent spinner.
- Neon free suspends compute when idle and wakes in 1–2 seconds. Keep the Hikari pool small (`maximum-pool-size: 3`) and retry the first connection.
- Render free has no persistent disk. PDFs are generated in memory and streamed. Nothing touches the filesystem.
- Vercel free serves the SPA. `vercel.json` rewrites everything to `index.html`.

## 3. Domain model

```
users             id, email (unique), password_hash, full_name, role, enabled, created_at
refresh_tokens    id, user_id, token_hash, expires_at, revoked_at
certificates      id, code (unique, e.g. CERT-7K2M-9XQ4), recipient_name, recipient_email,
                  course_name, workload_hours, completion_date, issue_date, instructor_name,
                  template, status, created_by, created_at, updated_at
batch_imports     id, user_id, filename, total_rows, success_count, error_count, errors_json, created_at
```

No separate `Course` entity in the MVP. Course data lives on the certificate. If reuse becomes a real need later it enters as its own OpenSpec change, not as speculation now.

The REST contract lives in `docs/api-reference.md`.

### PDF generation

Thymeleaf renders one HTML template per layout (`classic`, `modern`, `minimal`) and OpenHTMLtoPDF converts it to A4 landscape. Templates as versioned HTML and CSS are reviewable in a PR, which programmatic drawing with iText would not be. The QR code comes from ZXing, embedded as a data URI, pointing at the frontend route `/verify/{code}`.

## 4. Task backlog

One row, one branch, one pull request.

### Phase 0 — Foundation

| # | Branch | Delivers |
|---|---|---|
| 0.1 | `chore/bootstrap-monorepo` | folder structure, README, .gitignore, .editorconfig, license |
| 0.2 | `chore/openspec-init` | OpenSpec initialized, `project.md`, `AGENTS.md`, baseline specs for the five capabilities |
| 0.3 | `chore/agent-harness` | `CLAUDE.md`, `docs/`, `.claude/agents/`, `.claude/commands/` |

### Phase 1 — Backend

| # | Branch | Delivers |
|---|---|---|
| 1.1 | `feat/backend-skeleton` | Spring Boot, dev and prod profiles, Flyway, Testcontainers, health check, global error handler |
| 1.2 | `feat/jwt-auth` | users, login, refresh rotation, logout, roles, BCrypt, login rate limiting |
| 1.3 | `feat/certificate-crud` | entity, repository, service, controller, validation, pagination and search |
| 1.4 | `feat/certificate-pdf` | three Thymeleaf templates, OpenHTMLtoPDF, embedded fonts, download endpoint |
| 1.5 | `feat/public-verification` | unique code generation, public endpoint, QR code in the PDF |
| 1.6 | `feat/batch-csv-import` | CSV parsing, per-row validation, error report, sample CSV download |

### Phase 2 — Frontend

| # | Branch | Delivers |
|---|---|---|
| 2.1 | `feat/frontend-shell` | Angular workspace, routing, layout, Material theme, SCSS tokens, HTTP layer and interceptors |
| 2.2 | `feat/login-page` | reactive form, auth guard, silent refresh in the interceptor, cold-start state |
| 2.3 | `feat/certificate-list` | paginated table, search, filters, row actions, empty and error states |
| 2.4 | `feat/certificate-form` | create and edit, validation, template preview, delete confirmation |
| 2.5 | `feat/batch-upload-ui` | CSV upload, import result view, sample download |
| 2.6 | `feat/public-verify-page` | public verification route outside the authenticated layout |

### Phase 3 — Delivery

| # | Branch | Delivers |
|---|---|---|
| 3.1 | `ci/github-actions` | build and test both stacks, `openspec validate --strict`, lint, approval workflow |
| 3.2 | `chore/deploy-render-neon` | multi-stage Dockerfile, production migrations, environment variables, CORS |
| 3.3 | `chore/deploy-vercel` | production build, `vercel.json`, API environment variable, project linked to the repo |
| 3.4 | `docs/final` | README with local setup, architecture and how to run the spec-driven loop |

Nineteen pull requests. That is deliberate: small PRs are what make agent review worth running.

## 5. Review and approval

Four agents review every PR in parallel: `spec-reviewer`, `backend-reviewer`, `frontend-reviewer`, `security-reviewer`. Findings are classified `blocker`, `should-fix`, `nit`. Blockers are fixed on the same branch and the affected agents re-run.

GitHub does not allow a PR author to approve their own PR, and every PR here is authored by the same account. The approval is therefore submitted by `github-actions[bot]` from `.github/workflows/agent-approve.yml`, triggered when the harness adds the `agent-approved` label. This requires *Allow GitHub Actions to create and approve pull requests* under Settings → Actions → General → Workflow permissions.

## 6. CI

`.github/workflows/ci.yml`, on pull request and on push to `main`:

- **spec** — `openspec validate --strict`
- **backend** — `./mvnw verify` with Testcontainers PostgreSQL
- **frontend** — `npm ci`, lint, headless tests, production build

Branch protection on `main`: no direct pushes, PR required, all three checks required.

## 7. Remaining setup

1. Neon account and the free Postgres connection string.
2. Render account; `render.yaml` ships in phase 3.2 and the repo is connected through the Render UI.
3. The GitHub Actions approval setting described in section 5.

Neon and Render are only needed in phase 3, so they do not block the start.

## 8. Decision log

- **2026-08-16 — Spring Boot 4.1.x, not 3.x.** The original decision (row above) said 3.x. By the time `feat/backend-skeleton` (1.1) started, every Spring Boot 3.x line had reached OSS end-of-life (the 3.5 branch ended June 30, 2026) — no security patches, not offered by start.spring.io for new projects. Spring Boot 4.0 remains available but loses OSS support in December 2026, making it a poor starting point for a new project. Spring Boot 4.1 is Spring's current recommendation for new projects. Java 21 already satisfies Spring Boot 4's Jakarta EE 11 baseline, so no other stack decision changes.
