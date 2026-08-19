## 1. Table

- [x] 1.1 `certificate-list-page.component.html`: replace `mat-table` with a CSS grid — header row in overline type, body rows sharing one `grid-template-columns` value defined once and reused by the skeleton.
- [x] 1.2 Cells: code in tabular numerals in the light accent step; recipient name over email; course name over "workload · template"; issue date in tabular numerals. Long values truncate with an ellipsis rather than wrapping.
- [x] 1.3 Remove the status column and the status filter control; stop passing `status` from this screen's request.
- [x] 1.4 Header block: title, "Import CSV" secondary button, "New certificate" accent button. Below it, the search field with its leading icon and a clear button that appears once there is a term. Keep the existing debounce.

## 2. Row actions

- [x] 2.1 Replace the four icon buttons with one actions button per row, opening a `@angular/cdk/menu` panel with Edit, Preview and Download PDF, plus a separated Delete for ADMIN.
- [x] 2.2 The CDK's menu stack closes any other open menu, renders the panel in an overlay so the table card cannot clip it, and supplies the arrow-key model — replacing the hand-rolled signal, document listeners and `data-row-menu` probe an earlier draft used.
- [x] 2.3 The CDK handles outside click, Escape and focus restoration, and sets `aria-haspopup`/`aria-expanded` on the trigger and the menu roles on the panel; the panel is named after the certificate it acts on.
- [x] 2.4 Rebuild the confirmation on `@angular/cdk/dialog` as `shared/confirm-dialog/`, styled in Tailwind per `docs/design-spec.md` section 2. The call sites change: both callers move from `MatDialog.open(...)` to `ConfirmDialogService.confirm(...)`. Its spec asserts the modal semantics, the accessible name and description, and that a dismissal reads as a refusal; the focus trap and focus restoration are the CDK's own defaults and are not re-asserted here.
- [x] 2.5 Add `shared/toast/`: a snackbar service and host, anchored bottom-left, at most one action, dismissed after 4s, replacing the `MatSnackBar` the app declares but never imported.

## 3. Loading, empty and error states

- [x] 3.1 Skeleton rows using the shared column template, with the shimmer animation from the token layer, shown for first load, page changes and search changes.
- [x] 3.2 Split the empty state: no search term offers create; with a search term, name the term and offer both create and clear-search.
- [x] 3.3 Error state on the same card, with the retry action and the `traceId` when present.

## 4. Paginator

- [x] 4.1 Replace `mat-paginator` with a right-aligned row: page size select (10/20/50), a tabular-numerals range label, and previous/next icon buttons disabled at the ends.

## 5. Cleanup and tests

- [x] 5.1 Drop `MatTable`, `MatPaginator`, `MatFormField`, `MatSelect` and `MatIcon` from the component's imports; reduce `.scss` to what utilities cannot express.
- [x] 5.2 `certificate-list-page.component.spec.ts`: rewrite the table assertions against the grid markup; add cases for the row menu (opens, only one open, closes on Escape and outside click, delete hidden for non-admins), the two empty states, the skeleton during an in-flight request, and the paginator's page size options.
- [x] 5.3 Remove the status-filter test cases and assert that no `status` parameter is sent.

## 6. Verification

- [x] 6.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 6.2 Against the running backend: the list, the row menu, delete as ADMIN through the confirmation, the success toast, the empty state and the page-size control. Docker returned later in the session, so this was done after all — and it found two defects the unit suite had not: the page-size control displayed 10 while requesting 20 (a `[value]` binding applied before `@for` had rendered the options), and the actions menu was clipped by the table card.
- [x] 6.3 Keyboard pass: the menu is `@angular/cdk/menu`, so arrow keys, Home/End, Escape and focus restoration come from the CDK rather than being approximated. An earlier draft shipped `role="menu"` without any of that, which promised a keyboard model it did not have.
- [x] 6.4 Checked at 375px and 1440px against the mockup. The first pass at 375px found the row unusable — the fixed columns total roughly 510px, so the recipient and course cells were empty and the actions column sat entirely off-screen — and the row now stacks below the medium breakpoint.
- [x] 6.5 `npx -y @fission-ai/openspec@latest validate nocturne-certificate-list --type change --strict` passes.
