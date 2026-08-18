## Sidebar, not tabs

`design-spec.md` §4 argued for tabs in the top bar and against a drawer, because a 240px drawer holding one item does not pay for itself. The later app mockup reverses that: it keeps a 240px sidebar, and by then the menu holds three items with a fourth region (the user block and sign out) pinned to the bottom. The sidebar wins here because the bottom-pinned identity and sign-out block has nowhere natural to live in a tab strip, and because the argument against the drawer was about it being empty, which it no longer is. The spec text below describes the sidebar; `docs/design-spec.md` §4 is corrected in this change to match.

## Where the current user comes from

`GET /api/v1/auth/me` returns the authenticated user's id, name, email and role. The shell fetches it once on load and stores it in a `SessionService` signal, so the sidebar, the profile page (later) and any role-gated control read one source instead of decoding the JWT in several places. Decoding the token client-side was the alternative and is rejected: the claim set is an implementation detail of the auth change, and the frontend already has a typed endpoint for exactly this.

A failed `/me` call does not block the shell. The navigation renders; the identity block shows a neutral placeholder. Sign out stays available, because a user whose session is half-broken is precisely the one who needs it.

## Sign out and the refresh token

`POST /api/v1/auth/logout` revokes the refresh token server-side. The client clears both tokens regardless of the response — a network failure on logout must not leave the user apparently signed in. The request is fired first so a reachable server does revoke, and navigation to `/login` happens either way.

## Why the in-app lookup uses the public endpoint

`GET /api/v1/public/verify/{code}` returns exactly what the page shows and is already rate-limited. Adding an authenticated variant would duplicate the projection and split the rate-limiting story for no gain. The consequence to accept is that the in-app page is subject to the same public rate limit, and shows the same rate-limited state; the mockup draws that state, so this is intended rather than tolerated.

## Route naming

The in-app page is `/verify-code`, not `/verify`, so it cannot collide with the public `/verify` and `/verify/:code` routes that `nocturne-public-screens` adds. Route order would otherwise decide which one an unauthenticated visitor lands on, which is not a thing to leave to route order.
