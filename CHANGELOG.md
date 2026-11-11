# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/), and this project adheres to
[Semantic Versioning](https://semver.org/). See [RELEASING.md](RELEASING.md) for the release procedure.

Every release section states the backend versions it was tested with, as declared in the `compatibility`
field of `package.json`.

## [Unreleased]

First release of the Twake Contacts frontend, a Single Page Application allowing users to manage their
contacts. It shares its technical stack with the Twake Calendar frontend, reads and writes contacts on
`esn-sabre` (CardDAV) through `twake-calendar-side-service`, and signs users in over OIDC.

**Compatibility:** esn-sabre >= 2.4.7.9, twake-calendar-side-service >= 2.4.7.7

### Added

- Private contacts application for authenticated users, with OIDC sign in through `@linagora/twake-oidc`
  and SSO logout
- Address books: listing in a sidebar sorted alphabetically and grouped by category (mine, shared, domain),
  creation, editing, deletion and removal of shared books, with confirmation toasts
- Address book sharing: share dialog with member roles, public discovery switch, discovery and
  subscription of address books shared by other users
- Domain address books
- Contacts: listing loaded page by page with the server cursor, sorting by name or email from the column
  headers, creation, editing and deletion in dedicated pages
- Copy and move of contacts between address books, with a destination picker
- Import of contacts into an address book, export of address books and contacts
- Search across the user's address books
- Contact popover and row actions: send an email, create an event, open a chat, copy details
- Responsive layout for phones, with a navigation drawer
- Twake top bar with the application menu and the account menu
- Real time updates over websocket
- Dark mode toggle
- English, French, Vietnamese, Russian, Spanish, German and Italian translations
- Runtime configuration via static JS files (`.env.js`, `appList.js`), validated at startup: `SSO_BASE_URL`,
  `SSO_CLIENT_ID`, `SSO_SCOPE`, `SSO_REDIRECT_URI` and `SIDE_SERVICE_BASE_URL` are required, and a missing or
  malformed setting shows a page naming it
- Bounded API retry policy: 15 s timeout per attempt, reads retried twice, writes never replayed automatically,
  a `Retry-After` header capped to 3 s
- Address book page header with its sharing status and the actions of the sidebar
- Warning when a new contact's email already belongs to another contact
- High-contrast mode, switchable from every screen
- Skip link, a single main landmark, an h1 and a page title on every screen, and the interface language on
  the document
- Fallback page asking to refresh when the application bundle fails to load
- Build version in `version.js`, shown on the error page and sent as the Sentry release
- Docker image `linagora/twake-contacts-web`, with security headers and a configurable CSP `frame-ancestors`
- End to end test suite running against esn-sabre and the side service

### Changed

- Upgrade the jsdom test environment from 26.1.0 to 31.0.0; development and tests now require Node.js
  24.15.0 or later in the 24.x series ([#521](https://github.com/linagora/twake-contacts-frontend/pull/521))
- The application talks to `twake-calendar-side-service` (`SIDE_SERVICE_BASE_URL`) instead of an OpenPaaS
  backend and the DAV server directly

### Fixed

- Accessibility of the sidebar, the share dialog and the "Add a shared address book" dialog: accessible
  names, focus kept inside dialogs, keyboard submission
- Store kept up to date after creating, editing, moving or deleting a contact
- Listing errors: a failed page stays retryable, the error banner is cleared on navigation
- vCard handling: ADR components in RFC 6350 order, untyped phones and addresses kept untyped, trimmed emails
- Labels of address books without a name and of shared books named after their owner
- Long contact and address book names are ellipsized
- vCard round trips keep the card UID, the BDAY, TEL and ADR value types, the ADR components after the
  seventh and every value of a multi-valued EMAIL or TEL; malformed server answers (hrefs, ACLs, share
  access, invites, N components) no longer break a listing
- Contact ids are the decoded card file names, so cards with reserved characters open and save
- Accessibility: labelled fields and value kinds, decorative icons hidden, hoverable tooltips, keyboard
  operable sidebar sections, focus kept in place after closing a popover, removing a row or saving, share
  and search results announced to screen readers
- Each contact action has one name everywhere, and address books are renamed with "Rename"
- Copy and move feedback names the contact and its destination
- Backend error messages are no longer shown to users
