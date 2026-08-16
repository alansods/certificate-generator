---
description: Draft an OpenSpec change proposal for a task, without writing implementation code
argument-hint: <change-id and short description>
---

Draft an OpenSpec change for: $ARGUMENTS

Read `openspec/project.md`, `openspec/AGENTS.md`, `docs/PLAN.md` and the current `openspec/specs/` before writing anything.

Create `openspec/changes/<change-id>/` with `proposal.md`, `tasks.md`, the spec delta under `specs/<capability>/spec.md`, and `design.md` only if a decision genuinely needs justifying.

Then run `npx -y @fission-ai/openspec@latest validate <change-id> --strict` and fix whatever it reports.

Write no implementation code. End by showing the proposal and asking the owner to approve, in Portuguese.
