## 1. Dependencies

- [x] 1.1 `pom.xml`: `openhtmltopdf-pdfbox`, `spring-boot-starter-thymeleaf`, `com.google.zxing:core` + `javase`

## 2. Fonts and templates

- [x] 2.1 Vendor Open Sans (Regular + Bold, OFL-1.1) under `src/main/resources/fonts/`, `OFL.txt` included
- [x] 2.2 `templates/certificates/classic.html`, `modern.html`, `minimal.html` — self-contained XHTML, A4 landscape, embedded QR `<img>`

## 3. Rendering

- [x] 3.1 `QrCodeGenerator`: certificate code -> `{frontend-base-url}/verify/{code}` -> base64 PNG data URI
- [x] 3.2 `CertificatePdfService`: select template by `CertificateTemplate`, render via Thymeleaf, convert to PDF bytes via OpenHTMLtoPDF with both fonts registered
- [x] 3.3 `app.frontend-base-url` property: dev default `http://localhost:4200`, unset in prod until `chore/deploy-vercel`

## 4. Endpoint

- [x] 4.1 `GET /api/v1/certificates/{id}/pdf` on `CertificateController` — 200 `application/pdf` with `Content-Disposition: attachment`, 404 for an unknown id (reuses `CertificateNotFoundException`)

## 5. Tests (per docs/testing.md)

- [x] 5.1 One integration test per template (`CLASSIC`/`MODERN`/`MINIMAL`): response starts with `%PDF`, single page, extracted text contains recipient name and course name
- [x] 5.2 Unit: `QrCodeGenerator` produces a decodable QR whose content matches `{base-url}/verify/{code}`
- [x] 5.3 Integration: unknown id returns 404, no PDF generated
- [x] 5.4 Integration: anonymous request returns 401 (matches the certificate capability's existing authorization tests)

## 6. Wiring and docs

- [x] 6.1 Confirm `./mvnw verify` passes and `openspec validate --all --strict` passes
