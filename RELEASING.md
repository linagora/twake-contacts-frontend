# Releasing

Each release is a semver git tag `vX.Y.Z` on `main`, produced from the root `package.json` version, with
its section in [CHANGELOG.md](CHANGELOG.md).

## Versions and images

| Build | Docker image | `window.APP_VERSION` and Sentry release |
|-------|--------------|------------------------------------------|
| Tag `vX.Y.Z` | `linagora/twake-contacts-web:X.Y.Z` | `X.Y.Z` |
| Every `main` build | `linagora/twake-contacts-web:sha-<8 first chars of the commit>` | `sha-<8>` |
| Pull request | `linagora/twake-contacts-web-pr:<PR number>` | `<8>` |

`linagora/twake-contacts-web:branch-master` still follows the latest `main` build, but environments must
not be deployed from it: pin `X.Y.Z` or `sha-<8>`, so that a rollback is a tag change.

The running application exposes its version in `window.APP_VERSION` (from `/version.js`, written by
`apps/private/Dockerfile`) and on its error page.

## Changelog

`CHANGELOG.md` is kept by twake-changelog, the changelog automation of the Twake software factory: it
reviews the commits merged on `main` since its last pass and opens a pull request writing them under
`## [Unreleased]` (and a `## [X.Y.Z] - YYYY-MM-DD` section for a version tagged since), grouped by `Added`,
`Changed` and `Fixed`, in the style of the file. A pull request changing the app does not edit
`CHANGELOG.md`: its commits give what the automation needs, a subject a user can read (conventional
commits: `feat:`, `fix:`, `feat!:` for a breaking change), its issue or pull request number, and the steps
of an upgrade under `BREAKING CHANGE:` or an `Upgrade` section of the commit message. Review and merge the
pull requests of twake-changelog, fixing their wording there.

## Backend compatibility

The `compatibility` field of the root `package.json` declares the minimum `esn-sabre` and
`twake-calendar-side-service` versions. `scripts/compatibility.test.ts` checks that the images pinned in
`e2e/docker/Dockerfile.sabre` and `e2e/docker/Dockerfile.side-service` satisfy them. When a new frontend
feature relies on a newer backend, raise the minimum in `package.json`, `README.md` and the
`Compatibility` line of the `Unreleased` section.

## Cutting a release

1. Pick the level: `patch` for fixes only, `minor` for new features, `major` for a breaking change,
   including a raised backend minimum that existing deployments do not meet.
2. Bring the changelog up to date with every commit merged so far: run twake-changelog on this repository
   (Changelog proposals, in Other automations of the software factory dashboard) and merge the pull request
   it opens, or check it found nothing to propose. Then update your checkout of `main`, and on it bump the
   version of the root and of every workspace:

   ```bash
   npm version <patch|minor|major> --workspaces --include-workspace-root --no-git-tag-version
   ```

3. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, check its `Compatibility`
   line against `package.json`, and add a new empty `## [Unreleased]` section above it. (A version tagged
   without this step gets its section from twake-changelog at its next pass.)
4. Commit, get the pull request merged, then tag the merge commit on `main` and push the tag:

   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

5. Jenkins builds the tag (`buildingTag()`) and publishes `linagora/twake-contacts-web:X.Y.Z`.
6. Create the GitHub release of the tag with the `CHANGELOG.md` section as notes. If the tag was pushed
   before that section reached `main`, create the release once the next pull request of twake-changelog,
   which writes it, is merged.
