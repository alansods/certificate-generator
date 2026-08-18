## 1. Backend — profile update

- [ ] 1.1 `dto/UpdateProfileRequest.java`: full name and email with bean validation. No role field.
- [ ] 1.2 `AuthService.updateProfile(userId, request)`: reject an email belonging to another user with `EmailAlreadyRegisteredException`; save name and email; return the updated `UserResponse`.
- [ ] 1.3 `AuthController`: `PUT /me` returning 200 with `UserResponse`, taking the user id from the authenticated principal and never from the payload.

## 2. Backend — password change

- [ ] 2.1 `dto/ChangePasswordRequest.java`: current password, new password (password policy annotation) and the caller's refresh token.
- [ ] 2.2 `AuthService.changePassword`: verify the current password with the existing encoder, reject a mismatch as a field-level 400, store the new hash.
- [ ] 2.3 `RefreshTokenService.revokeAllForUserExcept(userId, keptTokenHash)`; call it from `changePassword`.
- [ ] 2.4 `AuthController`: `POST /me/password` returning 204.

## 3. Backend tests

- [ ] 3.1 Service tests: profile update persists; a duplicate email throws; the role is never modified; a wrong current password leaves the hash untouched; a successful change stores a hash verifying against the new password only.
- [ ] 3.2 A test that every other refresh token for the user is revoked and the caller's survives, and that refreshing with a revoked one returns 401.
- [ ] 3.3 Web tests: 200, 409, 400 and 401 for `PUT /me`; 204, 400 on a wrong current password, 400 on a policy failure and 401 unauthenticated for `POST /me/password`.

## 4. Frontend

- [ ] 4.1 `AuthApi.updateProfile()` and `AuthApi.changePassword()`, the latter passing the stored refresh token.
- [ ] 4.2 `features/account/pages/profile-page/`: identity header with the initials avatar, name, email and role; the profile card with name and email plus its own save; the password card with current, new and confirmation plus its own submit.
- [ ] 4.3 Client-side validation mirroring the backend rules, and the confirmation match; 409 surfaced on the email field and the current-password error on its field.
- [ ] 4.4 On a successful profile save, update `SessionService`'s signal so the navigation's name changes immediately; show the confirmation through the shared snackbar.
- [ ] 4.5 Clear the three password fields after a successful change.
- [ ] 4.6 `app.routes.ts`: `profile` under the authenticated shell; add the "My profile" item to the sidebar.

## 5. Frontend tests

- [ ] 5.1 `profile-page.component.spec.ts`: the header renders from the session; a valid save calls the API and updates the session; 409 marks the email field; each client-side rule blocks its request; a successful password change clears the fields; the two forms submit independently.
- [ ] 5.2 `shell.component.spec.ts`: the profile item renders and is marked active on the profile route.

## 6. Documentation and verification

- [ ] 6.1 `docs/api-reference.md`: both endpoints, including the refresh token in the password-change payload and why it is there.
- [ ] 6.2 `cd backend && ./mvnw verify` and `cd frontend && npm run build && npm run lint && npm test` all pass.
- [ ] 6.3 End to end: change the name and watch the sidebar update; change the password in one browser and confirm a second browser's session stops refreshing while the first keeps working.
- [ ] 6.4 `npx -y @fission-ai/openspec@latest validate user-profile --type change --strict` passes.
