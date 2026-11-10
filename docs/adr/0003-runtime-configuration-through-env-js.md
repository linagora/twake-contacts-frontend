# 3. Runtime configuration through `env.js`

## Status

Accepted

## Context

One Docker image is deployed to several environments, each with its own SSO,
backend URLs, linked applications and Sentry project. Build-time variables would
need one image per environment.

## Decision

The configuration is read at runtime from two scripts served next to the bundle
and loaded by `public/index.html` before it: `.env.js` (the variables) and
`appList.js` (the fallback application menu of the Twake Bar). They define
globals declared in `common/src/window.d.ts`. Both are gitignored; the
deployment mounts them, starting from `public/.env.example.js` and
`public/appList.example.js`. The Dockerfile does not precompress them, so a
mounted file is never shadowed by a stale `.gz`.

## Consequences

- The same image runs everywhere; a change of configuration needs no build.
- A new variable is added to `window.d.ts`, `.env.example.js` and the README
  table together.
- The configuration is public: it must never hold a secret.
