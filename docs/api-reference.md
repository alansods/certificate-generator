# API reference

Base path `/api/v1`. JSON only. Errors follow RFC 7807 (`application/problem+json`) and always carry a `traceId`.

## Auth

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | body `{fullName, email, password}` → `{accessToken, refreshToken, expiresIn}` (201). New accounts are always role `USER`. 409 if the email is already registered. Rate limited per client IP. 404 when self-registration is disabled. |
| GET | `/auth/registration-enabled` | public | `{enabled}` — lets the client hide the sign-up links when self-registration is off. |
| POST | `/auth/login` | public | body `{email, password}` → `{accessToken, refreshToken, expiresIn}`. Rate limited. |
| POST | `/auth/refresh` | public | body `{refreshToken}` → new pair. Old token is revoked (rotation). |
| POST | `/auth/logout` | bearer | revokes the presented refresh token |
| GET | `/auth/me` | bearer | `{id, email, fullName, role}` |
| PUT | `/auth/me` | bearer | body `{fullName, email}` → `{id, email, fullName, role}`. No role field — the role cannot be changed here. 409 if the email belongs to another user. |
| POST | `/auth/me/password` | bearer | body `{currentPassword, newPassword, refreshToken}` → 204. `refreshToken` is the caller's own token: a password change revokes every other refresh token for the user, and the server needs to know which one to keep. 400 with a field error on `currentPassword` if it doesn't match. `newPassword` must satisfy the password policy (8+ characters, at least one digit). |

Access token lifetime 15 minutes, refresh token 7 days, stored hashed.

## Certificates

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/certificates` | bearer | `?page&size&sort&q&status`. `q` matches recipient name, course name and code. |
| GET | `/certificates/{id}` | bearer | |
| POST | `/certificates` | bearer | creates, assigns a unique public code |
| PUT | `/certificates/{id}` | bearer | full update |
| DELETE | `/certificates/{id}` | ADMIN | |
| GET | `/certificates/{id}/pdf` | bearer | `application/pdf`, `Content-Disposition: attachment` |
| POST | `/certificates/batch` | bearer | `multipart/form-data` CSV → `{totalRows, successCount, errorCount, errors[]}` |
| GET | `/certificates/batch/template.csv` | bearer | sample CSV with the expected header |

### Certificate payload

```json
{
  "recipientName": "Jane Doe",
  "recipientEmail": "jane@example.com",
  "courseName": "Advanced Angular",
  "workloadHours": 40,
  "completionDate": "2026-05-12",
  "issueDate": "2026-05-15",
  "instructorName": "John Smith",
  "template": "CLASSIC",
  "status": "ISSUED"
}
```

`template` is one of `CLASSIC`, `MODERN`, `MINIMAL`. `status` is one of `DRAFT`, `ISSUED`, `REVOKED`.

### CSV format

Header, in this exact order:

```
recipient_name,recipient_email,course_name,workload_hours,completion_date,issue_date,instructor_name,template
```

Rows are validated individually. A bad row is reported with its line number and does not abort the batch.

## Public

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/public/verify/{code}` | public | returns recipient name, course name, workload, issue date and status only. Never returns email or internal ids. `REVOKED` returns 200 with `status: REVOKED`, not 404. |

The QR code embedded in the PDF points at the frontend route `/verify/{code}`, which calls this endpoint.
