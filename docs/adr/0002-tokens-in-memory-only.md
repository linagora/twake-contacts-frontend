# 2. Tokens in memory only

## Status

Accepted

## Context

The app signs in with OIDC (authorisation code with PKCE) through
`@linagora/twake-oidc`. Former versions kept the token set and the user info in
`sessionStorage`, where any script running on the origin, as an injected one,
can read them.

## Decision

The tokens live in memory only. They are there while the app navigates without
reloading; a reload starts a new login through the SSO, silent when the SSO
session is still open. `useInitializeApp` removes the `tokenSet` and `userData`
entries that former versions left in `sessionStorage`.

## Consequences

- No token survives the page, nor can be read from the storage.
- Every reload, and every new tab, goes through the SSO.
- Code must not persist a token, nor anything derived from it, to
  `localStorage`, `sessionStorage` or a cookie.
