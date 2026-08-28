## Why the password change revokes other sessions

A password change that leaves old refresh tokens valid is theater: the case the user is trying to solve is "someone else may have my password", and the attacker's session survives the change untouched for as long as their refresh token lives. So the change revokes every refresh token for that user except the one the caller is currently using.

Keeping the caller's own token is what makes the feature usable — revoking everything would sign the user out of the page they just used to fix their account. The caller's token is identified from the refresh token the client holds, sent alongside the password change, rather than inferred: the access token does not carry the refresh token's identity.

The theft-detection rule from the JWT change already handles a revoked token being presented later, so an attacker's next refresh fails through an existing path rather than a new one.

## Requiring the current password

`POST /me/password` requires the current password even though the caller is already authenticated. The access token can be minutes old and taken from an unlocked laptop; the current password is what proves the person at the keyboard is the account owner. A wrong current password returns 400 with a field error rather than 401, because the session is valid — it is the field that is wrong, and a 401 would send the client's refresh interceptor chasing a token problem that does not exist.

## Email change and 409

The email is the login identifier and is unique in the database. Changing it to one already taken has to fail, and it fails the same way registration does: 409, with the field marked in the form. No verification round trip is added — see the non-goals; the address is not yet trusted for anything, and `password-reset` is the change that has to decide what verification means.

## Two forms, one page, separate submits

The profile card and the password card save independently. Combining them would mean either asking for the current password to change a name, or letting a name change go through with an empty password field — both worse than two buttons. The page has no shared submit.
