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
