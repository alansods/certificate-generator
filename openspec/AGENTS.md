# OpenSpec workflow

Specs are the source of truth. Code exists to satisfy an approved spec. If implemented behavior is not described by any spec, the review fails.

## Stage 1 — Propose

Create `openspec/changes/<change-id>/` containing:

- `proposal.md` — why, what changes, what it affects
- `tasks.md` — an ordered implementation checklist
- `design.md` — only when a technical decision is not obvious
- `specs/<capability>/spec.md` — the delta, using `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`

Run `openspec validate <change-id> --strict`. Write no implementation code in this stage.

Requirement format:

```markdown
## ADDED Requirements

### Requirement: Certificate deletion
The system SHALL allow an ADMIN to delete a certificate.

#### Scenario: Admin deletes an existing certificate
- **WHEN** an ADMIN sends DELETE /api/v1/certificates/{id} for an existing certificate
- **THEN** the certificate is removed and the response is 204

#### Scenario: Non-admin attempts deletion
- **WHEN** a USER sends DELETE /api/v1/certificates/{id}
- **THEN** the response is 403 and the certificate still exists
```

## Stage 2 — Approve

The owner reads `proposal.md` and approves. Do not start implementing before that.

## Stage 3 — Implement

Branch from `main`, work through `tasks.md` in order, check items off as they land, write tests alongside the code. Keep the branch focused on a single change.

## Stage 4 — Review

Open the PR, run the four review agents, resolve every blocker, then label `agent-approved`.

## Stage 5 — Archive

After merge, run `openspec archive <change-id>`. The delta folds into `openspec/specs/` and the change moves to `openspec/changes/archive/`.

## Rules

- One change per PR.
- Never edit `openspec/specs/` by hand. It is only written by `openspec archive`.
- A change that turned out wrong is corrected with a new change, not by rewriting history.
