---
description: Implement an approved OpenSpec change on its own branch and open a pull request
argument-hint: <change-id>
---

Implement the approved change `$ARGUMENTS`.

1. Confirm the change exists and is validated. If it was never approved by the owner, stop and ask.
2. Create a branch named after the change, using the Conventional Commits prefix from `docs/PLAN.md`.
3. Work through `tasks.md` in order, checking items off as they land. Write tests alongside the code, never after.
4. Run the full local gate: `cd backend && ./mvnw verify`, `cd frontend && npm run lint && npm test && npm run build`, and `openspec validate --strict`.
5. Commit in logical chunks with Conventional Commit messages in American English.
6. Push and open a pull request whose body states: what the change does, which spec requirements it satisfies, how it was tested, and anything the reviewer should look at closely.
7. Report the PR URL and then run `/review-pr` on it.
