# Project context

## Purpose

A course certificate generator. Authenticated users manage certificates, generate branded PDFs, issue them in bulk from a CSV, and anyone can verify a certificate publicly by its code.

## Tech stack

- Frontend: Angular 22, TypeScript strict, Angular Material, SCSS design tokens
- Backend: Java 21, Spring Boot 3.x, Maven, Spring Security, Spring Data JPA, Flyway
- Database: PostgreSQL
- PDF: Thymeleaf + OpenHTMLtoPDF, QR codes via ZXing
- CI: GitHub Actions
- Hosting: Vercel, Render, Neon — all free tier

## Constraints

- The owner does not write code. Every decision has to be legible from the specs and the PR descriptions.
- Free tier only. No paid service anywhere in the stack.
- The backend host sleeps after inactivity, so a cold start of roughly 50 seconds is a normal state the UI must handle explicitly.
- The backend host has no persistent disk. PDFs are generated in memory and streamed; nothing is written to the filesystem.
- American English in all code, specs, docs and UI copy.

## Conventions

- Monorepo: `frontend/`, `backend/`, `openspec/`, `docs/`.
- One capability per spec folder. Capability names are noun phrases: `auth`, `certificates`, `certificate-pdf`, `public-verification`, `batch-import`.
- Requirements are written as `The system SHALL ...` with at least one `#### Scenario:` block each.
- A change is not done until its delta is archived into `openspec/specs/`.
