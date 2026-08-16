---
description: Run the four review agents against a pull request, fix blockers, and mark it approved
argument-hint: <pr number>
---

Review pull request $ARGUMENTS.

1. Fetch the diff.
2. Run `spec-reviewer`, `backend-reviewer`, `frontend-reviewer` and `security-reviewer` in parallel against it. Skip a stack-specific agent only when the diff does not touch that stack.
3. Merge the findings, dropping duplicates. Verify each blocker yourself before accepting it — a reviewer agent can be wrong, and a false blocker costs more than a missed nit.
4. Fix every confirmed blocker on the same branch, then re-run the affected agents on the new diff. Repeat until no blockers remain.
5. Post one consolidated review comment on the PR: confirmed findings grouped by severity, what was fixed in response, and what was deliberately left alone with the reason.
6. Only once there are no blockers and CI is green, add the `agent-approved` label so the approval workflow can approve the PR.
7. Report the outcome to the owner in Portuguese.
