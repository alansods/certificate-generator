# Certificate Generator

Course certificate generator: manage certificates, issue branded PDFs, import in bulk from CSV, and verify any certificate publicly by its code.

Angular 22 frontend, Spring Boot 3 backend on Java 21, PostgreSQL. Built spec-first with [OpenSpec](https://github.com/Fission-AI/OpenSpec) and reviewed by an agent harness.

## Layout

```
frontend/   Angular workspace
backend/    Spring Boot Maven project
openspec/   specs and changes — the source of truth
docs/       plan, style guide, API reference, testing policy
.claude/    review agents and workflow commands
```

## Getting started

Not scaffolded yet. `docs/PLAN.md` describes the full build order.

## How work happens here

Every change starts as an OpenSpec proposal, gets approved, lands on its own branch, and goes through a four-agent review before merging. See `openspec/AGENTS.md`.
