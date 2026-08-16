# Certificate Generator

Course certificate generator: manage certificates, issue branded PDFs, import in bulk from CSV, and verify any certificate publicly by its code.

Angular 22 frontend, Spring Boot 4 backend on Java 21, PostgreSQL. Built spec-first with [OpenSpec](https://github.com/Fission-AI/OpenSpec) and reviewed by an agent harness.

## Layout

```
frontend/   Angular workspace
backend/    Spring Boot Maven project
openspec/   specs and changes — the source of truth
docs/       plan, style guide, API reference, testing policy
.claude/    review agents and workflow commands
```

## Getting started

Backend (needs a local PostgreSQL on `localhost:5432`, database/user/password `certificate_generator`, and Docker for the test suite's Testcontainers):

```bash
cd backend
./mvnw spring-boot:run   # dev profile, http://localhost:8080
./mvnw verify             # full test suite
```

Frontend: not scaffolded yet (`feat/frontend-shell`, backlog item 2.1). `docs/PLAN.md` describes the full build order.

## How work happens here

Every change starts as an OpenSpec proposal, gets approved, lands on its own branch, and goes through a four-agent review before merging. See `openspec/AGENTS.md`.
