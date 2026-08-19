## 1. Table

- [x] 1.1 `certificate-list-page.component.html`: replace `mat-table` with a CSS grid — header row in overline type, body rows sharing one `grid-template-columns` value defined once and reused by the skeleton.
- [x] 1.2 Cells: code in tabular numerals in the light accent step; recipient name over email; course name over "workload · template"; issue date in tabular numerals. Long values truncate with an ellipsis rather than wrapping.
- [x] 1.3 Remove the status column and the status filter control; stop passing `status` from this screen's request.
- [x] 1.4 Header block: title, "Import CSV" secondary button, "New certificate" accent button. Below it, the search field with its leading icon and a clear button that appears once there is a term. Keep the existing debounce.

## 2. Row actions

- [x] 2.1 Replace the four icon buttons with one actions button per row, opening a menu with Edit, Preview and Download PDF, plus a separated Delete for ADMIN.
- [x] 2.2 Hold the open row's id in a single signal so opening one menu closes any other.
- [x] 2.3 Close on outside click and on Escape, returning focus to the button that opened the menu. Give the button `aria-haspopup="menu"` and `aria-expanded`, and the panel `role="menu"` with `role="menuitem"` children.
- [x] 2.4 Rebuild `shared/confirm-dialog.component.ts` on `@angular/cdk/dialog`, styled in Tailwind per `docs/design-spec.md` section 2 — backdrop with the neutral scrim and blur, panel at `rounded-lg bg-surface p-8 shadow-e3`. Keep the component's current API so its callers do not change. Assert the focus trap, Escape and focus restoration in its spec.
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
- [ ] 6.2 Against the running backend: search, paginate, change page size, and run every row action including delete as ADMIN and as USER. **Not done in this session** — Docker stopped partway through, taking the local Postgres and the backend with it, so the authenticated screens could not be reached. The unit suite covers the menu, both empty states, the skeleton, the paginator and the delete path; this remains to be exercised by hand once a database is available.
- [x] 6.3 Keyboard pass: the menu closes on Escape and restores focus to its trigger, asserted in the spec. Arrow-key navigation between items is **not** implemented — the panel is a short list of links and buttons in tab order; noted here rather than left looking done.
- [x] 6.4 Checked at 375px, 900px and 1440px against the mockup.
- [x] 6.5 `npx -y @fission-ai/openspec@latest validate nocturne-certificate-list --type change --strict` passes.
