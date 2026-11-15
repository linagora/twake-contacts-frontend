# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/), and this project adheres to
[Semantic Versioning](https://semver.org/). See [RELEASING.md](RELEASING.md) for the release procedure.

Every release section states the backend versions it was tested with, as declared in the `compatibility`
field of `package.json`.

## [Unreleased]

### Added

- Address book page header with its sharing status and the actions of the sidebar
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
- Warning when a new contact's email already belongs to another contact
- High-contrast mode, switchable from every screen
- Skip link, a single main landmark, an h1 and a page title on every screen, and the interface language on
  the document
- Fallback page asking to refresh when the application bundle fails to load
- Build version in `version.js`, shown on the error page and sent as the Sentry release
- Docker image `linagora/twake-contacts-web`, with security headers and a configurable CSP `frame-ancestors`
- End to end test suite running against esn-sabre and the side service

### Changed

- Dependabot only proposes `rstack` updates within >=0.8.5 <0.9.0 to remain compatible with
  `rslint-config-cozy-app@0.2.0`
- Upgrade the jsdom test environment from 26.1.0 to 31.0.0; development and tests now require Node.js
  24.15.0 or later in the 24.x series ([#521](https://github.com/linagora/twake-contacts-frontend/pull/521))
- The application talks to `twake-calendar-side-service` (`SIDE_SERVICE_BASE_URL`) instead of an OpenPaaS
  backend and the DAV server directly
- Emails and phones are listed by preference (`PREF`, or a `pref` token in `TYPE`), so the preferred email is the one used by the list, the mail composer and new events ([#612](https://github.com/linagora/twake-contacts-frontend/pull/612))
- A card with several `FN` variants is shown, sorted and given initials under the preferred one; the other single-value properties (`TITLE`, `NOTE`, `ROLE`, `ORG`, `NICKNAME`, `CATEGORIES`, `BDAY`) follow the same rule ([#632](https://github.com/linagora/twake-contacts-frontend/pull/632))

### Fixed

- Address books whose ids match built-in object properties, such as `__proto__`, are stored and listed
  correctly without mutating previous application state
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
- User and address book ids are decoded from DAV hrefs and encoded once in requests, and address book
  ids are encoded in navigation links, so ids containing spaces or reserved URL characters work
  consistently ([#514](https://github.com/linagora/twake-contacts-frontend/pull/514))
- Accessibility: labelled fields and value kinds, decorative icons hidden, hoverable tooltips, keyboard
  operable sidebar sections, focus kept in place after closing a popover, removing a row or saving, share
  and search results announced to screen readers
- Each contact action has one name everywhere, and address books are renamed with "Rename"
- Tablet-sized screens (769 to 1023 px wide) use the mobile layout, so address books stay reachable and the
  create button is no longer cut off
- Copy and move feedback names the contact and its destination
- Backend error messages are no longer shown to users
- Opening the sign-in callback page without a pending sign-in, by a reload, the Back button or a bookmark,
  signs in again instead of leaving a blank page ([#422](https://github.com/linagora/twake-contacts-frontend/pull/422))
- Phone numbers stored as `TEL` URIs are read whatever the case of `tel:`, and RFC 3966 `phone-context` parameters and percent escapes no longer end up in the displayed number ([#498](https://github.com/linagora/twake-contacts-frontend/pull/498))
- A moved contact is no longer listed twice when the destination already held a stale card with the same id ([#601](https://github.com/linagora/twake-contacts-frontend/pull/601))
- The contact count of an address book never goes below zero after a delete or a move ([#604](https://github.com/linagora/twake-contacts-frontend/pull/604))
- The Discovery switch of an address book shared with an Editor shows its real state and can unpublish it ([#605](https://github.com/linagora/twake-contacts-frontend/pull/605))
- Saving a contact keeps the multi-valued `ADR`, `ORG` and `N` components (a street on two lines, alternative organisation names) instead of joining them ([#602](https://github.com/linagora/twake-contacts-frontend/pull/602))
- Saving a contact keeps `ANNIVERSARY`, `IMPP`, `GENDER`, `GEO`, `TZ`, `LANG` and `REV`, which were deleted by any edit ([#609](https://github.com/linagora/twake-contacts-frontend/pull/609))
- Saving a contact keeps the parameters of its properties (`PREF`, `TYPE` list, `itemN` group, `ADR;LABEL`, `SORT-AS`, `LANGUAGE`, `ALTID`, `X-` parameters) for other clients ([#610](https://github.com/linagora/twake-contacts-frontend/pull/610))
- Saving a contact keeps every occurrence of `FN`, `ORG`, `NOTE`, `NICKNAME`, `TITLE`, `ROLE`, `BDAY` and `CATEGORIES`, language variants included ([#607](https://github.com/linagora/twake-contacts-frontend/pull/607))
- Saving a contact keeps the `N` components the form does not edit (additional names, prefix, suffix) ([#608](https://github.com/linagora/twake-contacts-frontend/pull/608))
- Saving a contact whose name is unchanged keeps its display name (`FN`) as written by another client, and `N;SORT-AS` is kept when the name only had surrounding spaces ([#606](https://github.com/linagora/twake-contacts-frontend/pull/606), [#630](https://github.com/linagora/twake-contacts-frontend/pull/630))
- Saving a contact keeps an `X-ABLabel` or `X-ABADR` that was alone in its group ([#631](https://github.com/linagora/twake-contacts-frontend/pull/631))
- Removing or reordering an address row no longer turns the later addresses into a single street line ([#611](https://github.com/linagora/twake-contacts-frontend/pull/611))
- An address known only by its `LABEL` is shown, and an address with neither components nor label is no longer listed as an empty row ([#618](https://github.com/linagora/twake-contacts-frontend/pull/618))
- Phones, emails and addresses are labelled with their first known `TYPE` (`TEL;TYPE=VOICE,CELL`, `INTERNET,HOME`), and unexpected `TYPE` values no longer break the display ([#613](https://github.com/linagora/twake-contacts-frontend/pull/613))
- A malformed card no longer prevents the other contacts of a page or a search from being listed ([#614](https://github.com/linagora/twake-contacts-frontend/pull/614))
- An `EMAIL` written `MAILTO:`, with spaces, `?subject=` or `%40` is read as the address alone ([#616](https://github.com/linagora/twake-contacts-frontend/pull/616))
- A card without a usable `FN` is named from its `N`, organisation, nickname or first email before falling back to its file name ([#617](https://github.com/linagora/twake-contacts-frontend/pull/617))
- Cards whose file name contains `.vcf` inside the name are no longer confused with another card on export, delete, copy or move ([#615](https://github.com/linagora/twake-contacts-frontend/pull/615))
- Cards written by other clients under a file name not ending in `.vcf` (`x.VCF`, `abc`) can be opened, exported, saved, deleted, copied and moved, and a card named `.` or `..` is refused instead of reaching another resource ([#634](https://github.com/linagora/twake-contacts-frontend/pull/634))
- A contact whose file name holds a literal `%2F` opens correctly ([#633](https://github.com/linagora/twake-contacts-frontend/pull/633))
- An external sharee invited by email is no longer looked up as a user nor named "mailto:" in the sharing dialog ([#629](https://github.com/linagora/twake-contacts-frontend/pull/629))
