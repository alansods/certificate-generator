## Open registration is a decision, not a default

Turning on `POST /auth/register` means anyone who can reach the API can create an account and read every certificate in the system — `certificates` has a "Shared certificate visibility" requirement, so a `USER` sees all of them, not just their own. That is a real widening of the product's exposure, and it should be said plainly rather than discovered later.

The owner asked for it, so it ships. Three things keep it from being reckless:

- **The flag.** `app.auth.registration-enabled` defaults to true but exists precisely so a deployment can turn it off without a code change. When it is off, the endpoint answers 404 rather than 403, so a disabled deployment does not advertise the feature.
- **The role.** New accounts are `USER`. Deletion stays ADMIN-only, and the bootstrap ADMIN is still the only one created outside this flow.
- **The rate limit.** The existing `RateLimiter` is reused per client IP so the endpoint cannot be scripted into thousands of rows.

If shared visibility turns out to be the wrong model once strangers can sign up, the fix is a scoping change to `certificates`, not a patch here.

## Account-existence disclosure

A registration endpoint that says "email already registered" tells an attacker which addresses have accounts. A registration endpoint that hides it tells the honest user nothing about why their signup failed. Every sign-up form in existence leaks this, because the honest user has to be told.

The chosen position: return 409 with a message that the email cannot be used, and rely on the IP rate limit to make enumeration expensive rather than pretending it is impossible. `POST /auth/login` keeps its stricter behavior — it still refuses to say whether the email or the password was wrong — because that endpoint has no honest reason to distinguish them.

## Why registration returns tokens

The alternative is to create the account and send the user to the login screen to type the password they just chose. Returning the same `TokenPairResponse` login returns costs nothing, reuses the token issuing path exactly, and removes a step. The refresh token is stored through the same `RefreshTokenService`, so rotation and theft detection apply from the first session.

## Password policy placement

"At least 8 characters, with one digit" is enforced in `RegisterRequest` with bean validation so the 400 comes back as a normal `ProblemDetail` with field errors, matching what the certificate form already does. The client mirrors the rule for immediate feedback but is not the enforcement point. The same rule is reused by `password-reset` and by the profile password change, so it lives in one constant rather than three annotations that can drift.
