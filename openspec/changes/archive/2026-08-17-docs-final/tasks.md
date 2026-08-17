## 1. README rewrite

- [x] 1.1 What the app does, tech stack, and an architecture diagram (frontend/backend/database, adapted from `docs/PLAN.md`).
- [x] 1.2 Local setup: backend (existing content, reviewed for accuracy) and frontend (new — `npm start`, `npm test`, `npm run build`, `npm run lint`).
- [x] 1.3 Environment variable reference, consolidated from `docs/deployment.md` (dev defaults vs. what production needs).
- [x] 1.4 Deployment: a short pointer to `docs/deployment.md`, not a duplicate of its steps.
- [x] 1.5 The spec-driven workflow: propose → approve → implement → review → merge → archive, linking `openspec/AGENTS.md`.
- [x] 1.6 Repo layout and docs index (`docs/PLAN.md`, `style-guide.md`, `api-reference.md`, `testing.md`, `deployment.md`).

## 2. Verification

- [x] 2.1 Every command shown in the README actually run once, matching current behavior (backend `./mvnw verify`, frontend `npm run build && npm run lint && npm test`).
- [x] 2.2 `openspec validate docs-final --type change --strict` passes.
