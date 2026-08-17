## Context

`certificate-list`'s design.md fixed the list page and its data layer. This document covers the create/edit form built on top of it.

## One component, two routes

`CertificateFormPageComponent` serves both `/certificates/new` and `/certificates/:id/edit`. Mode is read from the activated route: an `id` route param present means edit (loads via `CertificatesApi.get(id)`, submits via `update`), absent means create (submits via `create`). A single component rather than two near-identical ones, since the form itself — fields, validation, template preview — is entirely identical between the two; only the load-on-init step and the submit target differ.

## Dates as plain strings, no date-picker dependency

`completionDate`/`issueDate` are backend `LocalDate` values serialized as `"YYYY-MM-DD"` strings. Rather than adding `MatDatepickerModule` (which needs a date adapter — `provideNativeDateAdapter()` or a `date-fns`/`moment` adapter — for a feature this small), the form uses plain `<input matInput type="date">` bound directly to a string-typed `FormControl`. The native date input's value format is already `YYYY-MM-DD`, so no conversion layer is needed in either direction, and one less dependency to theme/configure.

## Client-side validation mirrors the backend, doesn't replace it

Angular `Validators.required`/`Validators.email`/`Validators.min(1)` on the matching controls, mirroring `CertificateRequest`'s `@NotBlank`/`@Email`/`@Positive` (`backend/src/main/java/com/certificategenerator/certificate/dto/CertificateRequest.java`). This is purely a fast-feedback layer — the backend's `MethodArgumentNotValidException` handler (`GlobalExceptionHandler`) is still the actual authority, and its `fieldErrors` map (keyed by field name, already used by `docs/api-reference.md`'s error shape) is mapped onto the corresponding form control's errors on a 400 response, so a validation gap between the two layers still surfaces correctly rather than failing silently.

## Template preview — a visual approximation, not the real PDF

The real certificate PDF only exists once a certificate is saved (`GET /{id}/pdf`, Thymeleaf + OpenHTMLtoPDF, server-side) — there's no way to preview it before that for a brand-new certificate being created. Instead, three small CSS-styled preview cards (one per template) sit next to the template `mat-select`, each a simplified, static visual approximation of that template's layout (border style, font emphasis, color accent) built directly in this component's template — not a live render of the user's actual form data, and not attempting to match the backend Thymeleaf templates pixel-for-pixel. Good enough to let a user distinguish "which one looks fancier" before picking, which is the actual job this requirement is doing.

## Delete — ADMIN-gated, reusing the existing dialog

Same `ConfirmDialogComponent` and `isAdmin()`-gated visibility pattern as `certificate-list-page.component.ts` (from 2.3) — not reinvented. Only rendered in edit mode (a certificate being created hasn't been saved yet, so there's nothing to delete).

## Package layout

```
frontend/src/app/features/certificates/pages/certificate-form-page/
├── certificate-form-page.component.ts
├── certificate-form-page.component.html
└── certificate-form-page.component.scss
```

`certificates.api.ts` (existing, from 2.3) gains `get(id)`, `create(request)`, `update(id, request)`.
