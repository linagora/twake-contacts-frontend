# Architecture

What a newcomer needs before changing the store, the listings, the sync or the
data access. It links to the code rather than copying it: the code is the
reference, this page gives the reasons. The decisions that must not be undone
by accident are recorded in [`adr/`](adr).

A change to the store shape, the listing engine, the sync or the data access
updates this page in the same pull request.

## Module map and layers

| Path | Holds |
|------|-------|
| [`apps/private/src`](../apps/private/src) | The application: routes ([`AppRoutes.tsx`](../apps/private/src/AppRoutes.tsx)), pages, dialogs, components |
| [`common/src/app`](../common/src/app) | Redux store and typed hooks (`useAppDispatch`, `useAppSelector`) |
| [`common/src/features/*/…Slice.ts`](../common/src/features) | State, reducers and the thunks exposed to the UI |
| [`common/src/features/*/services`](../common/src/features/Contacts/services) | The thunks: one async operation each, applying its result to the state |
| [`common/src/features/*/hooks`](../common/src/features/Contacts/hooks) | Backend reads with no place in the store (search, lookups, import, export) |
| [`common/src/features/*/…Dao.ts`](../common/src/features/Contacts/ContactsDao.ts) | Data access: the HTTP calls and the normalisation of their responses |
| [`common/src/utils/apiUtils.ts`](../common/src/utils/apiUtils.ts) | The `ky` instance: base URL, authorisation, retries, redirect on 401 |
| [`common/src/websocket`](../common/src/websocket) | Push notifications of the backend |
| [`common/src/locales`](../common/src/locales) | The 7 locales (en, fr, vi, ru, es, de, it) |

Calls go one way: component → hook or thunk → DAO → `api`. The import
boundaries are enforced by `rs lint` (see [`rstack.config.mjs`](../rstack.config.mjs)):

- `common/` never imports from `apps/`;
- `apps/` never imports a `…Dao.ts` module nor `ky`: it reaches the backend
  through a hook or a thunk of `common/`. Tests may still import a DAO to mock it.

## Store shape

[`contactsTypes.ts`](../common/src/features/Contacts/contactsTypes.ts) defines
`ContactsState`, normalised (see [ADR 0001](adr/0001-normalised-store-with-server-sorted-listings.md)):

- `addressBooks`: the books keyed by book id, each holding the contacts loaded
  so far in no particular order. The domain book is stored as `dab` while the
  backend calls its contacts `domain-members`. A shared book keeps the id of
  the user it is read from in `userId`.
- `listings`: the sorted lists shown by the views, keyed by
  `ALL_CONTACTS_LISTING` (`all`, the "My contacts" view) or by book id. A
  listing holds `refs` (book id + contact id, in display order) and `pages`
  (the cursor each page was read after and the index of its first ref).
- `sort`: the order the server sorts every listing in. The client never sorts
  the pages it receives; it only places a contact it created, renamed or moved,
  with [`Intl.Collator('en', { sensitivity: 'base' })`](../common/src/features/Contacts/contactListings.ts)
  mirroring the server order.

## Listing engine invariants

[`contactListings.ts`](../common/src/features/Contacts/contactListings.ts) and
[`fetchMoreContactsAsync.ts`](../common/src/features/Contacts/services/fetchMoreContactsAsync.ts):

- Pages are append-only: a page read after a cursor is added at the end, and a
  contact already listed keeps its place, so the table keeps unique keys and the
  pages before keep their start.
- `loadingRequestId` is the page in flight: a result from another request (the
  listing restarted meanwhile) is dropped.
- A cursor the server rejects with HTTP 400 restarts the listing from its first
  page, once (`restarted`). Any other failure, or a cursor rejected again, marks
  it `failed`: it keeps its pages and loads no more until the failure is cleared.
- A contact sorted after the last loaded one is left to the next pages, unless
  it was listed already: the server does not send again what is before its cursor.

## Realtime sync

[`WebSocketGate`](../common/src/websocket/WebSocketGate.tsx) opens the socket
(`WEBSOCKET_URL`) once signed in, and
[`useSyncRegistrations`](../common/src/websocket/operations/useSyncRegistrations.ts)
registers `/addressbooks/<userId>/<bookId>` for every book of the store,
registering everything again after a reconnection.

A push carrying a new `syncToken` dispatches
[`fetchUpdatedContacts`](../common/src/features/Contacts/services/fetchUpdatedContactsAsync.ts),
which reloads the **last 2 pages** of each listing showing that book: the pages
on screen after scrolling. Changes above them wait for the next visit. The
precise alternative is the sync-token `REPORT` of the book
([linagora/esn-sabre#459](https://github.com/linagora/esn-sabre/issues/459)),
applying only its changes. Import results come on the same socket.

## Address book kinds

The kinds are told apart by predicates of
[`contactsUtils.ts`](../common/src/features/Contacts/contactsUtils.ts) and by
the fields set in [`ContactsDao.ts`](../common/src/features/Contacts/ContactsDao.ts):

| Kind | How to tell | Capabilities |
|------|-------------|--------------|
| Own book | `ownerId` undefined | Edit, share, delete |
| Default book `contacts` and collected book `collected` | `HIDDEN_ADDRESS_BOOK_IDS` | Hidden from the sidebar; `collected` is never a write target |
| Delegated book | `ownerId` set, `shareAccess` the sharee's right | Write when `canWrite`, share when `shareAccess` is `AddressBookAccessLevel.Editor` (administration) |
| Subscription to a public book | `ownerId` set, created by `subscribeToAddressBook` | Read, or write when the source grants it |
| Domain book `dab` | `id === 'dab'`, `userId` the domain id | Read only from the UI, never shared nor a write target |

esn-sabre lists a subscription to a public book with `numberOfContacts: null`:
its count is read from its source book (a `PROPFIND` of `numberOfContacts`),
left unknown when that read fails.

## IDs in URLs

User, address-book and contact IDs are stored decoded. DAV href normalization
uses `decodeDavSegment`, preserving malformed percent encodings. DAV requests
use the segment-encoding helpers in `common/src/api/davPaths.ts`. UI links use
`apps/private/src/features/Contacts/contactPath.ts` to encode each route segment,
with its `%` escaped once more: React Router decodes the segment and turns every
`%2F` of a param into `/`, so a literal `%2F` would come back as `/`. Pages read
the IDs through `useContactRouteParams`, never `useParams`, which decodes the
params once more.

## Backend endpoints

Every call goes through `api`, prefixed by `SIDE_SERVICE_BASE_URL`, which points
at [twake-calendar-side-service](https://github.com/linagora/twake-calendar-side-service):

| Prefix | Served by | Used for |
|--------|-----------|----------|
| `dav/addressbooks/…` | esn-sabre (CardDAV), proxied | Books, contacts, sharing, subscriptions, export |
| `contacts/api/contacts/search` | side service | Search across books |
| `api/user`, `api/entity/…`, `api/people/search` | side service | Current user, owners, user search |
| `api/files`, `linagora.esn.dav.import/api/import` | side service | vCard import |

The calls live in [`ContactsDao.ts`](../common/src/features/Contacts/ContactsDao.ts)
and [`UserDao.ts`](../common/src/features/User/UserDao.ts).

A contact keeps the `etag` of the card it was read from (the listing item, or
the `ETag` header of a single card) so that saving never silently overwrites a
change saved meanwhile by someone else: an update sends it as `If-Match`, a
creation sends `If-None-Match: *`, and the server answers `412` when the card
changed. esn-sabre answers a JSON `PUT` without `ETag`, so the saved card is
read back, once, and stored with its ETag: the content and the ETag of the
store always belong to the same version. The edit form saves against the
version it was opened on, even when a realtime refresh replaced it meanwhile,
then against the version it saved itself when it stays open, as after a failed
move. A contact with no known ETag is updated without precondition.

The ETag kept is the one of the stored vCard, the one esn-sabre evaluates
`If-Match` against. Since esn-sabre 2.5.0.7 the `ETag` header of a single card
read as jCard is that ETag suffixed by `-json` (`"<stored>-json"`): `etagOf` in
[`ContactsDao.ts`](../common/src/features/Contacts/ContactsDao.ts) strips the
suffix, otherwise every update of a contact read this way is refused with
`412`.

Refused with `412`, the edit form does not give up at once: it reads the card
saved meanwhile and, when that version changed none of the fields the form
edited, saves the edited fields over it, once, against its ETag
([`rebaseContact.ts`](../common/src/features/Contacts/rebaseContact.ts)). The
fields are compared whole (the name, the emails, the phones…): a field changed
on both sides, or a version that cannot be read or has no known ETag, still
asks the user to reload.

This guard requires the side service to forward `If-Match` and
`If-None-Match` to esn-sabre. Served from another origin than the app, it must
also allow both request headers in CORS and expose `ETag`
(`Access-Control-Expose-Headers: ETag`): otherwise a contact opened directly by
URL, or read back after a save, has no known ETag. Contacts from listings carry
theirs in the JSON body.

Duplicate merges reread each candidate with `fetchContactForMerge`, require a
strong ETag, and compare the user-visible contact fields with the scanned
candidates. Changed candidates refresh the group and require another explicit
merge action. The
update (via `contact.etag` without `edits`, so it never rebases) and deletes
carry `If-Match` through the thunks to avoid overwriting or deleting a
concurrent edit after the reread. Before deleting any sources, the merge reads
the saved target again, requires a strong ETag, and compares the visible fields
with the plan, allowing repeated values to be reordered. A missing, unreadable
or changed target leaves all sources in place. Edits or deletion of the target by
another client can still occur after this read. A merge can finish only
partially. Retries reread the candidates, and a delete returning 404 is already
complete. Conflicting single-valued or opaque vCard details block deletion.
The merge keeps REV and PRODID from the primary card when present. It preserves
other opaque properties by name and exact content (including parameters).
The merge keeps distinct occurrences of X-* properties, PHOTO and SOUND.
Same-name conflicts on other opaque properties, such as KIND, block the merge.
Carried group names are unioned. A vCard editor or import workflow can reconcile
conflicts involving properties the contact form cannot edit.

The scan matches name, email, phone or Matrix ID within and across personal
books. Merge all requires confirmation before writing. Dismissing a group
records each declined pair on both cards with repeatable
`X-Twake-Duplicated-with` properties. The URN identifies the peer by its
address book and file ID, so copies with the same UID can be distinguished.
Moving a card to another book, or changing its file ID, changes this reference.
A marker in either direction prevents the pair from appearing together,
including through transitive matches. Merges also check fresh card reads for
dismissals and preserve unrelated markers on the survivor. Dismissal uses
conditional updates, can finish partially, and retries skip markers that are
already saved.

Copy and move check for duplicates in the chosen destination. Confirming a
transfer merge rereads the cards and checks for dismissals like a merge from
the duplicates page. If the candidates changed, the transfer dialog recomputes
the source's duplicate group from the fresh cards and reports the error even
when the group is gone. Later scans use a refreshed source while the same
contact prop is current. Transfer merges read each book's invite and ACL
before offering Merge and again at confirmation, using the original book for
delegated copies and counting its owner as a reader. The destination must be
readable only by people who can already read every copy. A wider audience or
an unavailable audience lookup leaves only the non-merge transfer available.
Its failure leaves the audience warning visible and the transfer retryable.
A merge during a move deletes other destination
duplicates before deleting the original card, so a failed destination deletion
leaves the original available for a retry.

## Authentication

OIDC authorisation code with PKCE through
[`@linagora/twake-oidc`](https://www.npmjs.com/package/@linagora/twake-oidc).
`api` adds the access token and starts a new login on HTTP 401. The tokens live
in memory only (see [ADR 0002](adr/0002-tokens-in-memory-only.md) and
[`useInitializeApp.ts`](../common/src/features/User/useInitializeApp.ts)): they
survive navigation without reload, and a reload signs in again through the SSO.

## Runtime configuration

The image reads its configuration at runtime from `.env.js` and `appList.js`,
loaded by [`public/index.html`](../public/index.html) as globals declared in
[`window.d.ts`](../common/src/window.d.ts) (see
[ADR 0003](adr/0003-runtime-configuration-through-env-js.md)). The variables are
listed in the [README](../README.md#configuring-the-application).

## CI and end-to-end tests

The [`Jenkinsfile`](../Jenkinsfile) builds the app, runs the unit tests
(`npm test`), the lint (`npm run lint`, `npm run lint:fmt`) and the Playwright
suite, then publishes the Docker images. The end-to-end stack (esn-sabre, side service, Dex…) and how to run it
locally are described in [`e2e/README.md`](../e2e/README.md).

The Docker Hub and GitHub credentials are bound only around the steps that publish
or comment, never while code of the checked out sources runs. A pull request from
the fork of an outside contributor runs no stage until a linagora member approves
it, or submits a review `Build this please`, on its head commit: a later push needs
a new review.

## Decision records

- [0001 Normalised store with server-sorted listings](adr/0001-normalised-store-with-server-sorted-listings.md)
- [0002 Tokens in memory only](adr/0002-tokens-in-memory-only.md)
- [0003 Runtime configuration through `env.js`](adr/0003-runtime-configuration-through-env-js.md)

A decision that reverses one of them adds a new record.
