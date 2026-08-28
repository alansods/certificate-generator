## Always answering 202

`POST /forgot-password` responds 202 for every syntactically valid email, whether or not an account exists. Anything else — a 404, a different latency, a different message — turns the endpoint into an account-existence oracle that needs no rate limit to be useful. The cost is that a user who mistypes their address gets the same reassuring screen and no email; the confirmation copy names the address back to them ("if <address> belongs to an account…") so the mistake is visible where it happened.

The rate limits are per IP and per email. The per-email limit is what stops someone from using the endpoint to mailbomb a known address; the per-IP limit is what stops a script from walking a list.

## Token storage

The reset token is generated as 32 bytes of `SecureRandom`, base64url-encoded, and only its SHA-256 hash is stored — the same rule `auth`'s "Refresh token storage" requirement already imposes, for the same reason: a database leak must not hand out live tokens. The raw value exists only in the email.

Single use is enforced by a `used_at` column, atomically claimed with a conditional `UPDATE ... WHERE used_at IS NULL` rather than a separate check-then-set, so two concurrent requests racing on the same valid token cannot both succeed. The column is set, not deleted, so a used token can be told apart from a never-issued one for support and audit purposes when inspecting the database directly — the API response itself is deliberately uniform: unknown, used and expired tokens all get the identical "this reset link is invalid or has expired" message, so the response never leaks which of the three states applies.

Thirty minutes is the expiry. It is short enough that a forwarded or archived email stops being a key quickly, and long enough for a real person to find the message. Requesting a new reset invalidates any outstanding one for that user, so the newest link in the inbox is always the one that works — which is what people actually try.

## Revoking sessions on reset

A completed reset revokes every refresh token for that user, with no exception for a caller — unlike the profile password change, the person resetting is not signed in, and the whole premise is that someone else might be. This is the one place where signing out every session, including any the legitimate user has open elsewhere, is the correct outcome.

## The mail abstraction and the development default

A `MailSender` interface with two implementations: `LoggingMailSender`, which writes the reset link to the log, and `SmtpMailSender` over `JavaMailSender`. The logging one is the default and the only one active in `dev` and in tests, so the whole flow can be developed and tested without an SMTP account, and no test ever depends on a network round trip. Production selects SMTP through configuration and fails fast at startup if the required properties are missing — an app that silently logs reset links in production instead of sending them is worse than one that refuses to start.

The alternative, calling a provider's HTTP API (Resend, Postmark) directly, is rejected for now: SMTP keeps the dependency to a Spring starter, works with whatever the owner already has, and is swappable behind the same interface if a provider is chosen later.

Production additionally has no default for `app.mail.provider` at all (unlike `dev` and tests, where `logging` is the default) — it must be set explicitly to `smtp`, or the app refuses to start. A production deployment that silently fell back to `LoggingMailSender` would write live, unexpired, 30-minute account-takeover tokens into the log stream instead of emailing them, which is exactly the outcome this paragraph's closing sentence rules out.

The mail send itself is dispatched off the request thread by `PasswordResetMailDispatcher`, an `@Async`-annotated bean invoked from `PasswordResetService.requestReset`. This keeps "Always answering 202" honest end to end: without it, the matching-account branch would do a synchronous SMTP round trip inline before responding while the non-matching branch returns almost immediately, and a mail-provider outage would turn the matching branch into a `500` — both of which are exactly the kind of oracle the always-202 guarantee exists to prevent. The dispatcher swallows and logs any send failure rather than letting it propagate, since the caller has already received its 202 by the time the async task runs.

## Building the link

The email contains `{app.frontend-base-url}/reset-password?token=…`. The base URL is configuration, never derived from the incoming request's `Host` header — deriving it would let an attacker who can set that header send a legitimate-looking reset email pointing at their own site. This is the single most important line in this change to get right.

## Why the token goes in a query parameter

A path segment would be tidier, but the token then appears in the browser's history and in any referrer the page leaks. Both forms have that problem; the query parameter is chosen because the page can strip it from the URL with `history.replaceState` immediately after reading it, which a path segment cannot do without a navigation. The page does that on load.
