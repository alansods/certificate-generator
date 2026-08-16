## Why

Backlog item 1.4 (`docs/PLAN.md`). The `certificate-pdf` capability is already fully specified in `openspec/specs/certificate-pdf/spec.md`. `feat/certificate-crud` (1.3) gave every certificate a record and a code; this change is what actually turns that record into the branded document the product exists to produce.

## What Changes

Implement the `certificate-pdf` capability end to end against its existing baseline spec: three Thymeleaf templates (`CLASSIC`, `MODERN`, `MINIMAL`), OpenHTMLtoPDF rendering to A4 landscape entirely in memory, an embedded QR code pointing at the frontend verification route, embedded fonts, and a download endpoint. `GET /api/v1/certificates/{id}/pdf`.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
_None._ Every requirement this change implements already exists in `openspec/specs/certificate-pdf/spec.md`. `skip_specs: true`, same as the two previous backend changes.

## Impact

- Adds `backend/src/main/java/com/certificategenerator/certificate/pdf/` (service, QR generator, controller method on the existing `CertificateController`).
- Adds `backend/src/main/resources/templates/certificates/{classic,modern,minimal}.html` and a shared stylesheet.
- Adds `backend/src/main/resources/fonts/` (embedded, redistributable font files — see `design.md`).
- `pom.xml` gains OpenHTMLtoPDF, Thymeleaf, and ZXing dependencies.
- No frontend impact yet — the QR target route (`feat/public-verify-page`, 2.6) and the frontend base URL itself (`chore/deploy-vercel`, 3.3) don't exist yet; see `design.md` for how this change stays correct in the meantime.
