## Why

Backlog item 3.4 (`docs/PLAN.md`), the last item. The root `README.md` is the one written for `chore/bootstrap-monorepo`, before any of Phases 1–3 existed — it still says "Frontend: not scaffolded yet" and has no mention of the four frontend pages, the deploy pipeline, or how to actually run the whole thing end to end. Anyone landing on this repo today gets a description of a project that no longer matches what's here.

## What Changes

Rewrite `README.md`: what the app does end to end (not just the backend), local setup for both `backend/` and `frontend/` (the frontend section currently doesn't exist), an architecture diagram, the environment variable reference consolidated from `docs/deployment.md`, a pointer to `docs/deployment.md` for the actual deploy steps rather than duplicating them, and a short explanation of the spec-driven workflow (propose → approve → implement → review → merge → archive) for anyone who wants to add the next change themselves. No other file changes — this is documentation only.

## Capabilities

_None — documentation only, no application behavior changes. `skip_specs: true`._

## Impact

- Rewrites `README.md`.
- No code changes anywhere.
- Not in scope, but worth flagging separately: `docs/PLAN.md`'s 0.1 (`chore/bootstrap-monorepo`) listed a `.editorconfig` and a license as deliverables, and neither exists in the repo today. Picking a license is an ownership decision this proposal doesn't make on the owner's behalf — noted here rather than silently added or silently ignored.
