## Always answering 202

`POST /forgot-password` responds 202 for every syntactically valid email, whether or not an account exists. Anything else — a 404, a different latency, a different message — turns the endpoint into an account-existence oracle that needs no rate limit to be useful. The cost is that a user who mistypes their address gets the same reassuring screen and no email; the confirmation copy names the address back to them ("if <address> belongs to an account…") so the mistake is visible where it happened.

The rate limits are per IP and per email. The per-email limit is what stops someone from using the endpoint to mailbomb a known address; the per-IP limit is what stops a script from walking a list.

## Token storage

The reset token is generated as 32 bytes of `SecureRandom`, base64url-encoded, and only its SHA-256 hash is stored — the same rule `auth`'s "Refresh token storage" requirement already imposes, for the same reason: a database leak must not hand out live tokens. The raw value exists only in the email.

Single use is enforced by a `used_at` column checked and set in the same transaction as the password update, not by deletion, so a second click on the same link can be told "this link has already been used" rather than "invalid", and so a support question has something to look at.

Thirty minutes is the expiry. It is short enough that a forwarded or archived email stops being a key quickly, and long enough for a real person to find the message. Requesting a new reset invalidates any outstanding one for that user, so the newest link in the inbox is always the one that works — which is what people actually try.

## Revoking sessions on reset

A completed reset revokes every refresh token for that user, with no exception for a caller — unlike the profile password change, the person resetting is not signed in, and the whole premise is that someone else might be. This is the one place where signing out every session, including any the legitimate user has open elsewhere, is the correct outcome.

## The mail abstraction and the development default

A `MailSender` interface with two implementations: `LoggingMailSender`, which writes the reset link to the log, and `SmtpMailSender` over `JavaMailSender`. The logging one is the default and the only one active in `dev` and in tests, so the whole flow can be developed and tested without an SMTP account, and no test ever depends on a network round trip. Production selects SMTP through configuration and fails fast at startup if the required properties are missing — an app that silently logs reset links in production instead of sending them is worse than one that refuses to start.

The alternative, calling a provider's HTTP API (Resend, Postmark) directly, is rejected for now: SMTP keeps the dependency to a Spring starter, works with whatever the owner already has, and is swappable behind the same interface if a provider is chosen later.

## Building the link

The email contains `{app.frontend-base-url}/reset-password?token=…`. The base URL is configuration, never derived from the incoming request's `Host` header — deriving it would let an attacker who can set that header send a legitimate-looking reset email pointing at their own site. This is the single most important line in this change to get right.

## Why the token goes in a query parameter

A path segment would be tidier, but the token then appears in the browser's history and in any referrer the page leaks. Both forms have that problem; the query parameter is chosen because the page can strip it from the URL with `history.replaceState` immediately after reading it, which a path segment cannot do without a navigation. The page does that on load.
