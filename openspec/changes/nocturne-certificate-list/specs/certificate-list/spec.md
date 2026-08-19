## MODIFIED Requirements

### Requirement: Paginated certificate table
The system SHALL display certificates in a paginated table backed by `GET /api/v1/certificates`, as the authenticated shell's default landing page, showing the certificate code, recipient, course, issue date and available actions.

#### Scenario: Page loads
- **WHEN** an authenticated user navigates to the certificate list
- **THEN** the first page of certificates is fetched and rendered in a table with pagination controls matching the total count returned by the backend

#### Scenario: Row content
- **WHEN** a certificate is rendered as a row
- **THEN** the row shows the code in tabular numerals, the recipient name with the recipient email beneath it, the course name with the workload and template beneath it, and the issue date

#### Scenario: Narrow viewport
- **WHEN** the table is viewed below the medium breakpoint
- **THEN** each certificate's fields stack instead of sitting in fixed columns, and its actions remain reachable without horizontal scrolling

#### Scenario: Changing page
- **WHEN** a user selects a different page or page size
- **THEN** the table re-fetches with the corresponding `page`/`size` query parameters

#### Scenario: Page size options
- **WHEN** a user opens the page size control
- **THEN** the options offered are 10, 20 and 50

### Requirement: Row actions
The system SHALL offer each row's actions in a single per-row menu containing edit, preview and download, and SHALL include delete in that menu only for an ADMIN.

#### Scenario: Opening a row's menu
- **WHEN** a user selects the actions control on a row
- **THEN** a menu opens listing edit, preview and download for that certificate

#### Scenario: Only one menu is open at a time
- **WHEN** a user opens the actions menu on a row while another row's menu is open
- **THEN** the previously open menu closes

#### Scenario: Dismissing the menu
- **WHEN** a user presses Escape on an open actions menu
- **THEN** the menu closes and focus returns to the control that opened it

#### Scenario: Clicking away from the menu
- **WHEN** a user clicks outside an open actions menu
- **THEN** the menu closes, leaving focus wherever the user put it

#### Scenario: The menu is navigable by keyboard
- **WHEN** a user opens the actions menu from the keyboard
- **THEN** focus moves into the menu and the arrow keys move between its items, matching what the menu role promises

#### Scenario: Edit
- **WHEN** a user selects the edit action
- **THEN** the application navigates to that certificate's edit form

#### Scenario: Preview PDF
- **WHEN** a user selects the preview action
- **THEN** the user is taken to that certificate's preview page, which requests `GET /api/v1/certificates/{id}/pdf` and renders the certificate's actual PDF inline, not immediately saved to disk

#### Scenario: Download from the preview page
- **WHEN** a user selects the download action on the preview page
- **THEN** the previewed PDF is saved to disk

#### Scenario: Preview fetch fails
- **WHEN** the certificate or PDF request made by the preview page fails
- **THEN** the page shows an error message instead of a blank or stuck-loading state

#### Scenario: Download PDF
- **WHEN** a user selects the download action in the row menu
- **THEN** `GET /api/v1/certificates/{id}/pdf` is requested and the returned file is saved to disk directly, without navigating to the preview page

#### Scenario: Delete as ADMIN
- **WHEN** an ADMIN selects the delete action and confirms
- **THEN** `DELETE /api/v1/certificates/{id}` is requested and, on success, the row is removed from the table and a confirmation message is shown

#### Scenario: An action fails
- **WHEN** a delete or a download fails
- **THEN** a dismissible error message naming the certificate is shown, rather than the action failing silently

#### Scenario: Delete action hidden for non-admins
- **WHEN** a non-ADMIN user opens a row's actions menu
- **THEN** no delete action is listed

### Requirement: Empty and error states
The system SHALL distinguish an empty dataset from a search that matched nothing, and SHALL show a distinct, retryable error state when the request itself fails.

#### Scenario: No results
- **WHEN** a query with no search term returns zero certificates
- **THEN** an empty state is shown offering the create action, instead of an empty table

#### Scenario: Search matched nothing
- **WHEN** a query with a search term returns zero certificates
- **THEN** an empty state naming the search is shown, offering both the create action and an action that clears the search and re-runs the query

#### Scenario: Request fails
- **WHEN** the list request fails
- **THEN** an error state with a retry action is shown instead of a blank or stuck-loading table, including the `traceId` when the response carried one

## ADDED Requirements

### Requirement: Skeleton loading preserves the table's shape
The system SHALL render a placeholder with the table's own column layout while a list request is in flight, rather than replacing the table with a spinner.

#### Scenario: List request is in flight
- **WHEN** a list request is pending, whether for the first load, a page change or a search change
- **THEN** placeholder rows using the table's column widths are shown, and the surrounding page layout does not shift when the real rows arrive

## REMOVED Requirements

### Requirement: Status filter
**Reason**: The redesigned list filters by search text only; the owner confirmed dropping the status column and its filter from this screen.
**Migration**: None needed in the frontend — the control and the column are removed. `GET /api/v1/certificates?status=` remains supported and tested on the backend, so the filter can be reintroduced as a frontend-only change; certificate status remains visible to recipients through the public verification page.
