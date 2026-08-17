# certificate-list Specification

## Purpose
TBD - created by archiving change certificate-list. Update Purpose after archive.

## Requirements

### Requirement: Paginated certificate table
The system SHALL display certificates in a paginated Material table backed by `GET /api/v1/certificates`, as the authenticated shell's default landing page.

#### Scenario: Page loads
- **WHEN** an authenticated user navigates to the certificate list
- **THEN** the first page of certificates is fetched and rendered in a table with pagination controls matching the total count returned by the backend

#### Scenario: Changing page
- **WHEN** a user selects a different page or page size
- **THEN** the table re-fetches with the corresponding `page`/`size` query parameters

### Requirement: Search
The system SHALL let a user filter the list by a search term matching recipient name, course name, or code, via the backend's `q` parameter.

#### Scenario: Search narrows results
- **WHEN** a user types a search term
- **THEN** the request is re-issued with `q` set to that term (debounced, not on every keystroke) and the table shows only matching rows

### Requirement: Status filter
The system SHALL let a user filter the list by certificate status (`DRAFT`, `ISSUED`, `REVOKED`), via the backend's `status` parameter.

#### Scenario: Filtering by status
- **WHEN** a user selects a status filter
- **THEN** the request is re-issued with `status` set accordingly and the table shows only certificates with that status

### Requirement: Row actions
The system SHALL let any authenticated user preview or download a certificate's PDF from its row, and SHALL let only an ADMIN delete a certificate from its row.

#### Scenario: Preview PDF
- **WHEN** a user selects the preview action on a row
- **THEN** the user is taken to that certificate's preview page, which requests `GET /api/v1/certificates/{id}/pdf` and renders the certificate's actual PDF inline, not immediately saved to disk

#### Scenario: Download from the preview page
- **WHEN** a user selects the download action on the preview page
- **THEN** the previewed PDF is saved to disk

#### Scenario: Preview fetch fails
- **WHEN** the certificate or PDF request made by the preview page fails
- **THEN** the page shows an error message instead of a blank or stuck-loading state

#### Scenario: Download PDF
- **WHEN** a user selects the download action on a row (not the preview action)
- **THEN** `GET /api/v1/certificates/{id}/pdf` is requested and the returned file is saved to disk directly, without navigating to the preview page

#### Scenario: Delete as ADMIN
- **WHEN** an ADMIN selects the delete action on a row and confirms
- **THEN** `DELETE /api/v1/certificates/{id}` is requested and, on success, the row is removed from the table

#### Scenario: Delete action hidden for non-admins
- **WHEN** a non-ADMIN user views the table
- **THEN** no delete action is rendered on any row

### Requirement: Empty and error states
The system SHALL show a distinct empty state when a query returns no results, and a distinct, retryable error state when the request itself fails.

#### Scenario: No results
- **WHEN** a query (with or without search/filter) returns zero certificates
- **THEN** an empty-state message is shown instead of an empty table

#### Scenario: Request fails
- **WHEN** the list request fails
- **THEN** an error state with a retry action is shown instead of a blank or stuck-loading table
