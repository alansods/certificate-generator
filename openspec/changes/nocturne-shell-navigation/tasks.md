## 1. Session state

- [x] 1.1 `auth.api.ts`: add `me()` calling `GET /api/v1/auth/me` and `logout()` calling `POST /api/v1/auth/logout`, typed against the backend's response DTOs.
- [x] 1.2 Add `core/auth/session.service.ts`: a `currentUser` signal, a `load()` that fetches `/me` once and swallows failures into a null user, and a `signOut()` that fires logout, clears `TokenStorageService` regardless of the outcome, and navigates to `/login`.

## 2. Shell chrome

- [x] 2.1 `shell.component.ts`: drop the Material imports and the `navOpen` toggle; inject `SessionService`, call `load()` on init, expose `currentUser` and the initials.
- [x] 2.2 `shell.component.html`: 64px sticky top bar with the brand as a link to `/certificates`, and the quick-verify form at the right — bordered field, tabular numerals, submit button.
- [x] 2.3 240px sidebar: "Menu" overline, then `Certificates` and `Verify code` as items with inline SVG icons and an accent-tinted active state driven by `routerLinkActive`.
- [x] 2.4 Sidebar footer: divider, initials avatar on `accent-800`, name and role, then the "Sign out" item calling `SessionService.signOut()`. Render the neutral placeholder when the user is null.
- [x] 2.5 Below the medium breakpoint the sidebar becomes a bottom-anchored horizontal bar and the quick-verify form is not rendered; touch targets stay at 44px.
- [x] 2.6 `shell.component.scss`: only what utilities cannot express.
- [x] 2.7 `docs/design-spec.md` §4 already describes the sidebar and carries the reason: the correction landed with `nocturne-design-system`, which copied the specification into the repository.

## 3. In-app verification page

- [x] 3.1 Add `features/verification/pages/verify-code-page/`: form with the code-shape check, submit calling `VerificationApi`, and the six result states from the spec.
- [x] 3.2 The page reads an optional `code` query parameter and looks it up on load, so the top bar can hand a code over.
- [x] 3.3 `app.routes.ts`: add `verify-code` under the authenticated shell's children.
- [x] 3.4 `features/verification/ui/verification-result/` holds the result card — the six states, the live region and the revoked dimming — and both pages render it. The public page keeps its glow and card chrome; this one keeps the shell's page header.

## 4. Tests

- [x] 4.1 `session.service.spec.ts`: `load()` populates the signal; a failing `/me` leaves it null without throwing; `signOut()` clears tokens and navigates even when logout fails.
- [x] 4.2 `shell.component.spec.ts`: both navigation items render and the active one is marked for the current route; name and role render from the session; the placeholder renders when the user is null; sign out calls the service; the brand links to the list.
- [x] 4.3 `verify-code-page.component.spec.ts`: idle, in-flight, valid, revoked, not-found and rate-limited states; a malformed code makes no request; the `code` query parameter triggers a lookup on load.
- [x] 4.4 A test asserting the quick-verify form navigates to the page with the code as a query parameter.

## 5. Verification

- [x] 5.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 5.2 Sign out end to end against the running backend: the refresh token is revoked, and a reload does not restore the session.
- [x] 5.3 Keyboard pass on the chrome: navigation items, quick-verify field and sign out all reachable with a visible focus ring.
- [x] 5.4 Chrome checked at 375px, 900px and 1440px against the mockup.
- [x] 5.5 `npx -y @fission-ai/openspec@latest validate nocturne-shell-navigation --type change --strict` passes.
