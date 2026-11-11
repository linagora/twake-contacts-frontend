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

## IDs in URLs

User, address-book and contact IDs are stored decoded. DAV href normalization
uses `decodeDavSegment`, preserving malformed percent encodings. DAV requests
use the segment-encoding helpers in `common/src/api/davPaths.ts`. UI links use
`apps/private/src/features/Contacts/contactPath.ts` to encode each route segment
once; React Router returns decoded IDs to the pages.

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

## Decision records

- [0001 Normalised store with server-sorted listings](adr/0001-normalised-store-with-server-sorted-listings.md)
- [0002 Tokens in memory only](adr/0002-tokens-in-memory-only.md)
- [0003 Runtime configuration through `env.js`](adr/0003-runtime-configuration-through-env-js.md)

A decision that reverses one of them adds a new record.
