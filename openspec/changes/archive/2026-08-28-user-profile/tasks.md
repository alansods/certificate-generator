## 1. Backend — profile update

- [x] 1.1 `dto/UpdateProfileRequest.java`: full name and email with bean validation. No role field.
- [x] 1.2 `AuthService.updateProfile(userId, request)`: reject an email belonging to another user with `EmailAlreadyRegisteredException`; save name and email; return the updated `UserResponse`.
- [x] 1.3 `AuthController`: `PUT /me` returning 200 with `UserResponse`, taking the user id from the authenticated principal and never from the payload.

## 2. Backend — password change

- [x] 2.1 `dto/ChangePasswordRequest.java`: current password, new password (password policy annotation) and the caller's refresh token.
- [x] 2.2 `AuthService.changePassword`: verify the current password with the existing encoder, reject a mismatch as a field-level 400, store the new hash.
- [x] 2.3 `RefreshTokenService.revokeAllExcept(user, rawTokenToKeep)`; call it from `changePassword`. Looks the kept token up first and requires it to be a live, unrevoked token belonging to that user, so a stale or mismatched token can't cause "except" to revoke everything including the caller's own session.
- [x] 2.4 `AuthController`: `POST /me/password` returning 204.

## 3. Backend tests

- [x] 3.1 Service tests: profile update persists; a duplicate email throws; the role is never modified; a wrong current password leaves the hash untouched; a successful change stores a hash verifying against the new password only.
- [x] 3.2 A test that every other refresh token for the user is revoked and the caller's survives, and that refreshing with a revoked one returns 401.
- [x] 3.3 Web tests: 200, 409, 400 and 401 for `PUT /me`; 204, 400 on a wrong current password, 400 on a policy failure and 401 unauthenticated for `POST /me/password`.

## 4. Frontend

- [x] 4.1 `AuthApi.updateProfile()` and `AuthApi.changePassword()`, the latter passing the stored refresh token.
- [x] 4.2 `features/account/pages/profile-page/`: identity header with the initials avatar, name, email and role; the profile card with name and email plus its own save; the password card with current, new and confirmation plus its own submit.
- [x] 4.3 Client-side validation mirroring the backend rules, and the confirmation match; 409 surfaced on the email field and the current-password error on its field.
- [x] 4.4 On a successful profile save, update `SessionService`'s signal so the navigation's name changes immediately; show the confirmation through the shared snackbar.
- [x] 4.5 Clear the three password fields after a successful change.
- [x] 4.6 `app.routes.ts`: `profile` under the authenticated shell; add the "My profile" item to the sidebar.

## 5. Frontend tests

- [x] 5.1 `profile-page.component.spec.ts`: the header renders from the session; a valid save calls the API and updates the session; 409 marks the email field; each client-side rule blocks its request; a successful password change clears the fields; the two forms submit independently.
- [x] 5.2 `shell.component.spec.ts`: the profile item renders and is marked active on the profile route.

## 6. Documentation and verification

- [x] 6.1 `docs/api-reference.md`: both endpoints, including the refresh token in the password-change payload and why it is there.
- [x] 6.2 `cd backend && ./mvnw verify` and `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 6.3 End to end: change the name and watch the sidebar update; change the password in one browser and confirm a second browser's session stops refreshing while the first keeps working.
- [x] 6.4 `npx -y @fission-ai/openspec@latest validate user-profile --type change --strict` passes.

## 7. Review fixes

The four review agents (backend, frontend, security, spec) each found real issues in the first pass. Fixed:

- [x] 7.1 Backend: `updateProfile` and `changePassword` were not `@Transactional` — a failure partway through could leave the password changed but other sessions still live, or the reverse. Both are now atomic.
- [x] 7.2 Backend: neither write endpoint was rate limited. `changePassword` now bounds brute-forcing `currentPassword` with a stolen access token (`app.rate-limit.password-change`); `updateProfile` now bounds using the 409-vs-200 response as an email-enumeration oracle (`app.rate-limit.profile-update`).
- [x] 7.3 Backend: `updateProfile`'s uniqueness check and save weren't atomic — a concurrent race could slip past both and surface as a raw 500. Now caught and turned into the same 409.
- [x] 7.4 Backend: email is now normalized (trimmed, lowercased) before the uniqueness check and the save, so `Jane@Example.com` and `jane@example.com` are the same account.
- [x] 7.5 Backend: `RefreshTokenService.revokeAllExcept` now looks the kept token up first and requires it to be live and owned by the caller — a stale or foreign token used to silently revoke every session, including the caller's own.
- [x] 7.6 Backend: a new password identical to the current one is now rejected, rather than silently ending every other session for no actual change.
- [x] 7.7 Backend: added the missing 401 test for `POST /me/password` (only `PUT /me` had one), a `PasswordPolicyTest`, and coverage for the no-digit policy branch (only the too-short branch was tested).
- [x] 7.8 Frontend: the profile screen had no loading or failed-load state — `SessionService.load()` swallowing a failed `GET /me` to `null` left a blank, fully submittable form under a "—" avatar. `SessionService` now exposes `loading`/`loadFailed` signals; the screen shows a spinner, then a retry banner, then the forms.
- [x] 7.9 Frontend: the confirm-password validator mutated the sibling control's own errors, which fought that control's validation run — an empty confirmation showed "Passwords do not match" instead of "Confirm your new password". Now a plain group-level validator read via `form.errors?.['mismatch']`.
- [x] 7.10 Frontend: a successful profile save never marked the form pristine, so the prefill effect stopped syncing after the first edit. Fixed.
- [x] 7.11 Frontend: the password-changed confirmation didn't mention that it signs out every other session, which is the whole point of the requirement. Toast copy now says so.
- [x] 7.12 Frontend: reverted the sidebar identity block from a second `/profile` link back to non-interactive — the nav item already covers the route, and a second active link would have needed its own `aria-current` bookkeeping for no real benefit.
- [x] 7.13 Frontend: added a persistent password-policy hint (previously only shown after a failed submit), an `h1` of "My profile" instead of the user's own name, and tests for the generic (non-field) error banner and the in-flight disabled-button state on both forms.
- [x] 7.14 Specs: added scenarios for the loading/failed-load states, the blank-confirmation-is-not-a-mismatch case, and the generic-failure case on both forms — all had tests but no scenario.

## 8. Second review pass fixes

The four review agents each found real issues in the second pass, against the diff this branch had already pushed as a PR. Fixed:

- [x] 8.1 Backend: `updateProfile`'s catch of `DataIntegrityViolationException` never actually ran — `save()` on an already-managed entity is a no-op merge, so the constraint violation surfaced at commit, outside the try. Changed to `saveAndFlush`.
- [x] 8.2 Backend: `UpdateProfileRequest.fullName`/`email` had no upper bound, unlike the VARCHAR(255) columns backing them. Added `@Size(max = 255)`.
- [x] 8.3 Backend: `ChangePasswordRequest.currentPassword`/`newPassword` had no upper bound before reaching BCrypt. Added `@Size(max = 128)`.
- [x] 8.4 Backend: a new password identical to the current one threw `InvalidCurrentPasswordException`, which maps to `fieldErrors.currentPassword` — wrong field, since the message is about the new password. New `NewPasswordSameAsCurrentException` maps to `fieldErrors.newPassword`.
- [x] 8.5 Backend: an unknown/revoked/foreign refresh token during `changePassword` propagated `InvalidRefreshTokenException`, which maps to 401 — but the caller's access token was valid, so the frontend's refresh-and-retry interceptor would loop pointlessly. New `InvalidRefreshTokenForPasswordChangeException` maps to 400 with `fieldErrors.refreshToken`, without touching the 401 mapping the actual `/auth/refresh` endpoint still needs.
- [x] 8.6 Backend: `updateProfile` returned the `User` entity to the controller, which mapped it to `UserResponse` there — entities must not cross the controller boundary per the style guide. The mapping now happens inside `AuthService.updateProfile`.
- [x] 8.7 Backend: `requireById` is now `@Transactional(readOnly = true)`, matching that it's a pure lookup; self-invocation from the two write methods keeps their own transaction demarcation unchanged.
- [x] 8.8 Backend: `changePassword` cleared the rate-limit counter before calling `revokeAllExcept`, so a rollback triggered by that call left the in-memory (non-transactional) counter cleared anyway. Moved the `clear()` to the last statement.
- [x] 8.9 Backend: `revokeAllExcept`'s lookup of the kept token checked ownership and revocation but not expiry. Added an expiry check.
- [x] 8.10 Backend: `updateProfile` cleared its rate-limit counter on every successful save, which let an attacker interleave a legitimate same-email update with a probe of a taken email to reset the counter indefinitely. Removed the clear-on-success for this bucket only; the login/refresh/password-change buckets are unaffected.
- [x] 8.11 Frontend: `handleSubmitError` returned early whenever `problem.fieldErrors` was present, even if none of the keys matched a real control — leaving the spinner cleared and nothing shown. Now falls through to the generic message when no field error actually applied.
- [x] 8.12 Frontend: the `aria-live="polite"` error wrappers had an inner `role="alert"` (implicitly `assertive`), producing two competing announcements per error. Removed the inner `role="alert"`.
- [x] 8.13 Frontend: the failed-session-load Retry button had `hover:` but no `active:` state, unlike the rest of the page's buttons. Added `active:bg-revoked-bg`, matching the existing revoked-button pattern used elsewhere (e.g. the confirm dialog).
- [x] 8.14 Frontend: the "check the highlighted fields" validation summary stayed shown after the user fixed the fields, until the next submit attempt. Now cleared reactively via `statusChanges` once the form becomes valid.
- [x] 8.15 Frontend: `submitProfile`/`submitPassword` had no defensive guard against re-entrant calls beyond the disabled button. Added an early return on `profileSubmitting()`/`passwordSubmitting()`.
- [x] 8.16 Frontend tests: switched from dispatching a synthetic `submit` `Event` on the form to clicking the actual submit button, so the tests exercise the real interaction path, including the disabled-button double-submit guard.
- [x] 8.17 Specs: added `Profile write rate limiting`, and scenarios for the same-as-current password rejection, the case-insensitive email duplicate, the bad-refresh-token rollback, and the in-flight/disabled-submit state on both profile-page forms — all implemented and tested but previously unspecified.
