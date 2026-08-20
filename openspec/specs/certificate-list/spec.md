# certificate-list Specification

## Purpose
TBD - created by archiving change certificate-list. Update Purpose after archive.

## Requirements

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

#### Scenario: Column headers survive the narrow layout
- **WHEN** the table is viewed below the medium breakpoint, where the header row is not drawn
- **THEN** the column headers remain available to assistive technology, so every cell still belongs to a named column

#### Scenario: Header actions
- **WHEN** the certificate list is shown
- **THEN** the page header offers both creating a certificate and importing a batch from CSV, each reachable as a link rather than hidden behind a menu

#### Scenario: Changing page
- **WHEN** a user selects a different page or page size
- **THEN** the table re-fetches with the corresponding `page`/`size` query parameters

#### Scenario: Page size options
- **WHEN** a user opens the page size control
- **THEN** the options offered are 10, 20 and 50

### Requirement: Search
The system SHALL let a user filter the list by a search term matching recipient name, course name, or code, via the backend's `q` parameter, and SHALL offer a control inside the search field that clears the term.

#### Scenario: Search narrows results
- **WHEN** a user types a search term
- **THEN** the request is re-issued with `q` set to that term (debounced, not on every keystroke) and the table shows only matching rows

#### Scenario: Clearing the search from the field
- **WHEN** the search field holds a term
- **THEN** a labeled clear control is shown inside the field, and selecting it empties the term and re-runs the query unfiltered

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

#### Scenario: The current page emptied
- **WHEN** the dataset shrinks under the user so that the current page number is past the end, for example after deleting the last row of the final page
- **THEN** the list steps back to the last page that has rows instead of showing the empty state over a dataset that is not empty

#### Scenario: Request fails
- **WHEN** the list request fails
- **THEN** an error state with a retry action is shown instead of a blank or stuck-loading table, including the `traceId` when the response carried one

### Requirement: Skeleton loading preserves the table's shape
The system SHALL render a placeholder with the table's own column layout while a list request is in flight, rather than replacing the table with a spinner.

#### Scenario: List request is in flight
- **WHEN** a list request is pending, whether for the first load, a page change or a search change
- **THEN** placeholder rows using the table's column widths are shown, and the surrounding page layout does not shift when the real rows arrive

### Requirement: Preview page context and actions
The system SHALL identify the certificate being previewed and SHALL offer, alongside download, a way back to the list and a way to the certificate's edit form.

#### Scenario: Preview page identifies the certificate
- **WHEN** a user opens a certificate's preview page
- **THEN** the page shows that certificate's code, recipient name, course name and template alongside the rendered PDF

#### Scenario: Editing from the preview
- **WHEN** a user selects the edit action on the preview page
- **THEN** the application navigates to that certificate's edit form

#### Scenario: Returning to the list
- **WHEN** a user selects the back action on the preview page
- **THEN** the application navigates to the certificate list

#### Scenario: The document is always treated as a PDF
- **WHEN** the certificate document is rendered inline
- **THEN** it is presented as a PDF regardless of the content type the response claims, since the inline document runs in the application's own origin

#### Scenario: PDF is still being fetched
- **WHEN** the PDF request is in flight
- **THEN** a placeholder in the printed page's aspect ratio is shown with a message that the PDF is being generated, and the page layout does not shift when the document arrives
