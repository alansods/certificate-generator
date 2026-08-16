# Certificate Generator

Course certificate generator. Angular frontend, Spring Boot backend, monorepo, spec-driven with OpenSpec.

## Language standard

All code, identifiers, comments, commit messages, PR titles and bodies, specs, docs and user-facing UI copy are written in **American English**. The human owner writes in Portuguese; reply to him in Portuguese, but never put Portuguese in the repository.

## Context files

Read these before working. Do not inline their content here.

- `docs/PLAN.md` — full project plan: architecture, domain model, API surface, task backlog, deploy strategy
- `docs/style-guide.md` — Angular, SCSS and Java conventions
- `docs/api-reference.md` — REST contract
- `docs/testing.md` — what "tested" means per layer
- `openspec/project.md` — OpenSpec project context
- `openspec/AGENTS.md` — the spec-driven workflow rules

## Stack

| Layer | Choice |
|---|---|
| Frontend | Angular 22, standalone components, signals, Angular Material + custom SCSS |
| Backend | Java 21, Spring Boot 4.1.x, Maven, Spring Security, Spring Data JPA, Flyway |
| Database | PostgreSQL (Neon free tier) |
| PDF | Thymeleaf templates rendered by OpenHTMLtoPDF, QR via ZXing |
| Hosting | Vercel (frontend), Render (backend), Neon (database) — all free tier |

## Layout

```
frontend/     Angular workspace
backend/      Spring Boot Maven project
docs/         context documents
openspec/     specs and changes (source of truth)
.claude/      agents and commands
.github/      CI and approval workflows
```

## Working agreement

The owner does not write code. Every change goes through this loop:

1. Write an OpenSpec change under `openspec/changes/<id>/` and run `openspec validate --strict`. No implementation code yet.
2. Get the owner's approval on the proposal.
3. Create a branch, implement against `tasks.md`, write tests alongside.
4. Open a PR, run the four review agents, fix every blocker.
5. Label the PR `agent-approved` so the approval workflow can approve it, then merge and run `openspec archive <id>`.

Branch names and commits follow Conventional Commits: `feat/`, `fix/`, `chore/`, `docs/`, `ci/`.

Never commit secrets. Connection strings and JWT keys are environment variables only.

## Commands

```bash
# backend
cd backend && ./mvnw spring-boot:run
cd backend && ./mvnw verify

# frontend
cd frontend && npm start
cd frontend && npm run lint && npm test

# specs
npx -y @fission-ai/openspec@latest validate --strict
```

## Session hygiene

Update this file and the docs in `docs/` at the end of every session when decisions change. Stale context is worse than no context.
