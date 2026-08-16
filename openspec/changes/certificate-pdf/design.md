## Context

`openspec/specs/certificate-pdf/spec.md` fixes the external contract. `docs/PLAN.md` fixes the stack: Thymeleaf + OpenHTMLtoPDF, A4 landscape, ZXing for the QR. This document covers what's left open.

## Library and rendering pipeline

`com.openhtmltopdf:openhtmltopdf-pdfbox` renders a Thymeleaf-produced HTML string straight to a `ByteArrayOutputStream` — never touching disk, per the capability's own purpose statement and the free-tier "no persistent disk" constraint from `docs/PLAN.md`. Thymeleaf's default `TemplateMode.HTML` is used (Thymeleaf 3.x folded XHTML support into HTML mode — there's no separate `XHTML` mode); the three templates are hand-written as well-formed, self-closing XHTML source so OpenHTMLtoPDF's stricter XML parser accepts Thymeleaf's output without modification.

## Templates

Three separate files, `templates/certificates/{classic,modern,minimal}.html`, selected by `CertificateTemplate` via a plain `switch`. Separate files rather than one template with a style-variable — `docs/PLAN.md`'s own rationale for Thymeleaf over programmatic drawing is that "templates as versioned HTML and CSS are reviewable in a PR," which holds better for three independently readable documents than one template branching internally. Each is self-contained (inline `<style>`), since OpenHTMLtoPDF resolves stylesheet links relative to a base URI we'd otherwise have to fake.

Page size A4 landscape, set via `@page { size: A4 landscape; }`.

## Fonts

Open Sans (Regular + Bold), OFL-1.1 licensed, vendored under `src/main/resources/fonts/` (`OFL.txt` included for attribution). Chosen over relying on system fonts because the spec requires embedded fonts for viewer-independent rendering, and a free-tier container has no guarantee of any particular font being installed. Registered via `PdfRendererBuilder.useFont(File, String)` for both weights; the templates' CSS references the family by name so OpenHTMLtoPDF embeds the actual glyphs used rather than linking externally.

## QR code

Generated with ZXing (`com.google.zxing:core` + `javase`) as a PNG, embedded directly in the Thymeleaf HTML as a `data:image/png;base64,...` URI — matching `docs/PLAN.md`'s explicit choice ("embedded as a data URI"). This sidesteps OpenHTMLtoPDF needing to fetch an external image mid-render.

**QR content — a decision this change has to make now that the spec's scenario doesn't fully pin down.** The spec's example ("decodes to the frontend route `/verify/CERT-7K2M-9XQ4`") describes a path, but a bare path isn't independently openable by a phone's camera app — it needs a scheme and host. Introduces `app.frontend-base-url`: dev defaults to `http://localhost:4200` (matching the CORS origin already configured in `feat/backend-skeleton`); prod is unset until `chore/deploy-vercel` (3.3) supplies the real Vercel domain as an environment variable. The QR encodes `{frontend-base-url}/verify/{code}`. This satisfies the spec's scenario (the encoded value ends with the exact path named) while being an actually scannable URL once a real frontend exists.

## Endpoint

`GET /api/v1/certificates/{id}/pdf` on the existing `CertificateController`, authenticated (any role — no new authorization rule needed, matches the certificate capability's shared-visibility model), 404 via the existing `CertificateNotFoundException` path if the id doesn't exist. Response: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="{code}.pdf"`, bytes written directly — no `PdfResponse` DTO needed since the body isn't JSON.

## Package layout

```
com.certificategenerator.certificate.pdf
├── CertificatePdfService     orchestrates: pick template, render Thymeleaf, convert to PDF bytes
└── QrCodeGenerator            certificate code -> base64 PNG data URI
```

`CertificateController` gains one new method (`GET /{id}/pdf`) rather than a separate controller — it's still operating on the same resource, just a different representation.

## Testing

Per `docs/testing.md`'s "PDF generation asserted on bytes" guidance: assert the response body starts with the `%PDF` signature, has exactly one page (via PDFBox's own `PDDocument`, already on the classpath as `openhtmltopdf-pdfbox`'s dependency — no extra test dependency needed), and that `PDFTextStripper`-extracted text contains the recipient name and course name. One integration test per template to prove all three actually render (not just whichever one happens to be exercised by a single default-template test).
