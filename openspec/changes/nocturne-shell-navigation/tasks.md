## 1. Session state

- [ ] 1.1 `auth.api.ts`: add `me()` calling `GET /api/v1/auth/me` and `logout()` calling `POST /api/v1/auth/logout`, typed against the backend's response DTOs.
- [ ] 1.2 Add `core/auth/session.service.ts`: a `currentUser` signal, a `load()` that fetches `/me` once and swallows failures into a null user, and a `signOut()` that fires logout, clears `TokenStorageService` regardless of the outcome, and navigates to `/login`.

## 2. Shell chrome

- [ ] 2.1 `shell.component.ts`: drop the Material imports and the `navOpen` toggle; inject `SessionService`, call `load()` on init, expose `currentUser` and the initials.
- [ ] 2.2 `shell.component.html`: 64px sticky top bar with the brand as a link to `/certificates`, and the quick-verify form at the right — bordered field, tabular numerals, submit button.
- [ ] 2.3 240px sidebar: "Menu" overline, then `Certificates` and `Verify code` as items with inline SVG icons and an accent-tinted active state driven by `routerLinkActive`.
- [ ] 2.4 Sidebar footer: divider, initials avatar on `accent-800`, name and role, then the "Sign out" item calling `SessionService.signOut()`. Render the neutral placeholder when the user is null.
- [ ] 2.5 Below the medium breakpoint the sidebar becomes a bottom-anchored horizontal bar and the quick-verify form is not rendered; touch targets stay at 44px.
- [ ] 2.6 `shell.component.scss`: only what utilities cannot express.
- [ ] 2.7 `docs/design-spec.md` §4: correct the tabs-versus-drawer passage to describe the sidebar the app mockup actually specifies, with the reason (see `design.md`).

## 3. In-app verification page

- [ ] 3.1 Add `features/verification/pages/verify-code-page/`: form with the code-shape check, submit calling `VerificationApi`, and the six result states from the spec.
- [ ] 3.2 The page reads an optional `code` query parameter and looks it up on load, so the top bar can hand a code over.
- [ ] 3.3 `app.routes.ts`: add `verify-code` under the authenticated shell's children.
- [ ] 3.4 Share the result-card markup with the public verify page as a presentational component rather than copying it, keeping the two pages' chrome separate.

## 4. Tests

- [ ] 4.1 `session.service.spec.ts`: `load()` populates the signal; a failing `/me` leaves it null without throwing; `signOut()` clears tokens and navigates even when logout fails.
- [ ] 4.2 `shell.component.spec.ts`: both navigation items render and the active one is marked for the current route; name and role render from the session; the placeholder renders when the user is null; sign out calls the service; the brand links to the list.
- [ ] 4.3 `verify-code-page.component.spec.ts`: idle, in-flight, valid, revoked, not-found and rate-limited states; a malformed code makes no request; the `code` query parameter triggers a lookup on load.
- [ ] 4.4 A test asserting the quick-verify form navigates to the page with the code as a query parameter.

## 5. Verification

- [ ] 5.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [ ] 5.2 Sign out end to end against the running backend: the refresh token is revoked, and a reload does not restore the session.
- [ ] 5.3 Keyboard pass on the chrome: navigation items, quick-verify field and sign out all reachable with a visible focus ring.
- [ ] 5.4 Chrome checked at 375px, 900px and 1440px against the mockup.
- [ ] 5.5 `npx -y @fission-ai/openspec@latest validate nocturne-shell-navigation --type change --strict` passes.
