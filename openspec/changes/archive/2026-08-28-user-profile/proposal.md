## Why

An account, once created, is frozen. `GET /api/v1/auth/me` reads the profile and nothing writes it: a user who mistypes their name at sign-up, changes their email, or wants to rotate a password they suspect is compromised has no way to do any of it. The redesign adds a "My profile" page for exactly this, and it is the last of the three sidebar items.

The password change matters more than the name change. Until it exists, the only recovery path for a bad password is `password-reset`, which needs an inbox and a working email address — a heavier tool than "I know my current password and want a different one".

## What Changes

- `PUT /api/v1/auth/me` — updates the authenticated user's full name and email. Changing the email to one already registered returns 409. The role is not part of the payload and cannot be changed here.
- `POST /api/v1/auth/me/password` — changes the authenticated user's password, requiring the current password. A wrong current password returns 400. The new password goes through the same password policy `user-signup` introduces.
- Changing the password revokes every refresh token for that user except the caller's own session, so a password change actually ends other sessions rather than only appearing to.
- A `/profile` page inside the authenticated shell: the identity header with the initials avatar, name, email and role; a card with editable name and email and a save action; and a second card for the password change with current, new and confirmation fields.
- Saving the profile updates the session signal, so the sidebar's name changes without a reload.
- The sidebar gains its "My profile" item.

## Capabilities

### Added Capabilities
- `profile-page` — the profile screen, its two forms and its outcomes. See `specs/profile-page/spec.md`.

### Modified Capabilities
- `auth` — gains profile update and password change, and the session-revocation rule that comes with the latter. See `specs/auth/spec.md`.

## Impact

- Backend: `AuthController` gains two endpoints, `AuthService` two methods, `dto/UpdateProfileRequest.java` and `dto/ChangePasswordRequest.java`; `RefreshTokenService` gains a revoke-all-except method. No migration.
- Frontend: `features/account/pages/profile-page/`, `AuthApi.updateProfile()` and `AuthApi.changePassword()`, a `profile` route under the shell, the sidebar item, and a `SessionService` update on save.
- `docs/api-reference.md` gains both endpoints.

## Dependencies

- `user-signup` for the shared password policy. If `user-signup` is deferred, the policy constant is introduced here instead and `user-signup` reuses it.
- `nocturne-shell-navigation` for the sidebar the "My profile" item is added to.

## Non-goals

- Email verification when the address changes. The address is not trusted for anything today; `password-reset` is what makes it matter, and it can add verification then.
- Deleting your own account, or any administration of other users. Both are their own change.
- Uploading an avatar. The initials block is the avatar.
