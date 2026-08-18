## Why

The list is the app's landing page and its densest screen, and it is the one the redesign changes most. Today it is a `mat-table` with six columns and two filter controls stacked above it, four icon buttons crowding every row, and a spinner that replaces the whole table while a page loads — so every search keystroke blanks the screen.

The mockup keeps five columns, folds the row's four actions into one menu, replaces the spinner with a skeleton that holds the table's shape, and reduces filtering to a single search field. The owner has confirmed the status column and the status filter go with it.

## What Changes

- Columns become Code, Recipient, Course, Issue date and Actions. Recipient stacks name over email; Course stacks the course name over workload and template; the code renders in tabular numerals in the light accent step.
- The status column and the status filter are removed. `status` stops being sent as a query parameter. The field is untouched in the domain, the API and the PDF — it simply is no longer surfaced or filtered on in this screen.
- The four per-row icon buttons become one menu: Edit, Preview, Download PDF, and — for ADMIN only — Delete, separated by a rule and in the revoked color. The menu closes on outside click and on Escape, and only one row's menu is open at a time.
- Loading renders a shimmering skeleton with the table's own column widths instead of replacing the table with a spinner.
- The empty state distinguishes "no certificates yet" from "no results for this search": the second offers a clear-search action alongside the create action.
- The paginator becomes a right-aligned row: page size 10/20/50, a tabular-numerals range label, and previous/next icon buttons.
- `MatTable`, `MatPaginator`, `MatFormField`, `MatSelect` and `MatIcon` leave the screen; the table becomes a CSS grid. The delete confirmation moves from `MatDialog` to a Tailwind-styled dialog on the CDK's `Dialog`, and the result toast is a Tailwind snackbar rather than `MatSnackBar` — which the app has never actually imported.

## Capabilities

### Modified Capabilities
- `certificate-list` — the table requirement restates its columns and drops the Material binding; row actions move into a menu; the empty state splits into two; a skeleton loading requirement is added. The status filter requirement is removed. See `specs/certificate-list/spec.md`.

## Impact

- `frontend/src/app/features/certificates/pages/certificate-list-page/` — template, styles and component rewritten.
- `frontend/src/app/shared/confirm-dialog.component.ts` — rebuilt on `@angular/cdk/dialog` and Tailwind, keeping its current API so callers do not change.
- Adds `frontend/src/app/shared/toast/` — a small snackbar service and host, bottom-left, one action, 4s, per `docs/design-spec.md` section 2.
- `certificates.api.ts` — the `status` parameter stops being passed by this screen; the method signature keeps it, since the backend contract is unchanged and other callers may want it.
- No backend impact. `GET /api/v1/certificates` already supports `q`, `page` and `size`; `status` remains supported and simply goes unused by this screen.

## Non-goals

- Changing what `status` means, or removing it from the domain, the API, the create/edit form or the PDF. Only the list's column and filter go.
- Sorting. The mockup's header is not interactive and the backend exposes no sort contract; adding one is its own change.
