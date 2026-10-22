# Twake Contacts web — end to end tests

A real browser driving the production image of the app against a real backend (esn-sabre,
twake-calendar-side-service, MongoDB, RabbitMQ, OpenSearch, Redis, OpenLDAP) and a real OIDC
provider (Dex). No mock, no stub. TypeScript + [Playwright](https://playwright.dev/), in a
standalone npm package: `e2e/` has its own `package.json` and lockfile and is not one of the app
workspaces.

The scenarios come from the QA test plan
(`automation/twake-qa/twake-contacts-frontend/TEST_PLAN.md`); [`e2e.md`](e2e.md) lists them, one
line per case, ticked once automated.

---

## Running it

Node 24 (`nvm use`), Docker with compose v2, Linux (the browser reaches the containers by their
IP). Everything else is in this directory: the stack is `docker/`.

```bash
cd e2e
./scripts/build.sh                     # once, and whenever the app changes: SPA bundle + images
npm ci
npx playwright install chromium        # once

./scripts/start.sh                     # backend + app, ~1 min
npx playwright test                    # whole suite, ~4 min with 4 workers
./scripts/stop.sh                      # removes containers, network and volumes
```

`start.sh` tests the image `twake-contacts-web-e2e` that `build.sh` builds from the working tree
(the production image of `apps/private/Dockerfile`, with `docker/frontend/env.js` as its
`.env.js`). Another image: `E2E_APP_IMAGE=<image> ./scripts/start.sh` (its `.env.js` must point to
the hosts below). A candidate esn-sabre: `./scripts/build.sh <sabre image>`.

Run a subset:

```bash
npx playwright test tests/share.spec.ts
npx playwright test -g NAV-01           # one case of the test plan
npx playwright test --project mobile    # the phone layout (390 × 844): RESP-* only
npx playwright test --ui                # watch mode, time travel
npx playwright show-report              # last HTML report
npx playwright show-trace test-results/artifacts/<test>/trace.zip
```

`E2E_HEADLESS=false` shows the browser, `E2E_SLOWMO=300` slows it down, `E2E_TRACE=on` records a
trace for every test (only failures otherwise), `E2E_WORKERS=<n>` sets the parallelism (4, 2 on
CI), `E2E_RETRIES=<n>` the retries of a failed test (1, see Flakiness). A failing test keeps a trace, a video and a screenshot under `test-results/artifacts/`;
reports go to `playwright-report/` (HTML) and `test-results/junit.xml`. The `globalSetup` refuses
to start when the stack does not answer, with the command to run.

### The stack

`docker/docker-compose.yml`, adapted from the e2e stack of twake-calendar-frontend: esn-sabre,
twake-calendar-side-service (MongoDB, RabbitMQ, OpenSearch, Redis), Dex over OpenLDAP, the mock
SMTP server, and the app. `scripts/start.sh` starts it as compose project
**`twake-contacts-e2e`**; the QA environment (`scripts/qa-environment/`) runs the same stack as
project `twake-contacts-qa`, so both can run at once.

| `docker/` | What |
|---|---|
| `Dockerfile.frontend`, `frontend/env.js` | the production image of the app with the `.env.js` of the stack |
| `Dockerfile.side-service`, `side-service/` | twake-calendar-side-service and its configuration (OIDC audience `twake-contacts`) |
| `Dockerfile.sabre` | esn-sabre, with the public key of the side service's JWTs |
| `Dockerfile.dex`, `dex/config.yaml` | Dex over LDAP, https with a self-signed certificate; client `twake-contacts` |
| `Dockerfile.ldap`, `ldap/populate.ldif` | OpenLDAP with the base of `open-paas.org`; the accounts are added by the tests |
| `Dockerfile.proxy`, `nginx/default.conf` | the nginx exposing the side service as `http://api` and Sabre as `http://dav`, with CORS |

The versions of esn-sabre and of the side service are pinned in their Dockerfile.

Nothing is published on the host. `start.sh` writes the IP of each container to
`.generated/stack.json`, and:

- the browser resolves the hosts of the app configuration to them with Chromium's
  `--host-resolver-rules` (`support/env.ts`): `localhost:8099` (the app: `localhost` is a secure
  context, so PKCE has `crypto.subtle`), `api` and `dav` (the nginx in front of the side service and
  Sabre, with CORS), `sso` (Dex over HTTPS, self-signed: `ignoreHTTPSErrors`);
- the harness calls the containers directly: the LDAP directory and the side service admin port
  to create accounts, Sabre to seed address books and contacts, the mock SMTP server to read the
  mails the backend sends.

**OIDC.** The app signs in through Dex (`SSO_*` of `docker/frontend/env.js`, client
`twake-contacts`), which authenticates against the LDAP directory; the side service checks the
tokens with Dex's introspection. The app
keeps its tokens in memory only: every full page load goes through Dex again and signs in silently
while the Dex session lasts (`ContactsPage.reload()` / `open()`).

---

## Writing a test

```ts
import { LoginPage } from '../pages'
import { expect, test } from '../support/fixtures'

test('NAV-02 selecting an address book', async ({ page, user, dav }) => {
  await dav.createAddressBook({ id: 'qa-book', name: 'QA Book' })
  await dav.putContact('qa-book', { firstName: 'Quentin', lastName: 'Book' })

  const contacts = await new LoginPage(page).loginAs(user)
  await contacts.openBook('QA Book')

  await expect(page).toHaveURL('/contacts/qa-book')
  await expect(contacts.row('Quentin Book')).toBeVisible()
})
```

### Conventions

- **The test plan ID starts the title**: `test('NAV-02 …')`, several when one spec covers them
  (`'I18N-02 I18N-03 …'`). Tick the line of `e2e.md`. A behaviour not in the plan gets a case there
  first.
- **Import `test` and `expect` from `support/fixtures`**, never from `@playwright/test`. Every page
  fails its test on an uncaught exception.
- **One user per test.** The `user` fixture creates `alice-<random>@open-paas.org` (an LDAP entry
  registered to the side service, password `secret`); accounts are never reused, so nothing is
  shared, nothing is reset: tests run in parallel on one stack, in any order. Never use a fixed
  account. To find a user in a search, type its full `uid`: prefixes such as `bob` match the users
  of the other tests.
- **Seed through CardDAV, assert through the UI** (and through CardDAV when the screen could lie:
  `dav.contactNames(book)`, `dav.getContact(book, uid)`). `DavClient` talks to Sabre with the admin
  impersonation credentials, as the calendar e2e suite does. Give a seeded book a readable id
  (`qa-book`): its page is `/contacts/qa-book`. A book shared with the user is a copy with a
  generated id: `dav.sharedCopyOf(owner, 'qa-book')`.
- **Locate through page objects** (`pages/`), never in a spec. The app exposes almost no
  `data-testid` (only the contact page actions): the page objects use roles and accessible names,
  in English, the default language of the stack. Scope them (sidebar entry, row, dialog), and
  match names exactly (`startsWith` for a shared book, whose name ends with its owner).
- **Web-first assertions** (`await expect(locator).toBeVisible()`), which retry, and `expect.poll`
  for backend state. No `waitForTimeout`.
- **A known open bug** (a file of the QA campaign's `critical_issues/`) does not make the suite
  red: `knownIssue('<slug>')` at the start of the test marks it as expected to fail, with an
  annotation. The day the bug is fixed the test passes, Playwright reports it, and the call goes.
- TypeScript strict, explicit return types, named exports (Playwright's config and
  `globalSetup` default exports are the only exceptions), `unknown` + guards for JSON.

### Fixtures

| Fixture | What |
|---|---|
| `user` | A brand new account (`E2EUser`: `uid`, `email`, `password`, `id` — the OpenPaaS id of `/addressbooks/<id>/…` —, `firstName`, `lastName`, `displayName`) |
| `users` | `users.create({ prefix: 'bob', lastName })` for more accounts |
| `dav` | CardDAV client of `user`: `createAddressBook`, `putContact`, `getContact`, `contactNames`, `listAddressBooks`, `sharedCopyOf`, `share(book, sharee, READ_ONLY \| READ_WRITE \| EDITOR)`, `publish(book, privilege)`, `publicAddressBookIds`, `request` for the rest |
| `davFor(other)` | The same for another account |
| `loginInNewContext(other)` | Signs another account in, in a browser context of its own; returns its `ContactsPage` |

Other helpers: `support/sideService.ts` (calls to the side service with the token the app sends:
`SideServiceClient.of(page).setLanguage('fr')`), `support/mail.ts` (`waitForMail(to, text)` on the
mock SMTP server), `support/popups.ts` (`popupUrl(page, action)`: the URL of the mail, chat or
calendar tab an action opens; those hosts answer a blank page).

### Flakiness

On a Docker host, Chromium aborts the requests in flight with `net::ERR_NETWORK_CHANGED` whenever
a network interface appears or goes, that is whenever a container of any stack of the host joins
or leaves a network. `LoginPage.loginAs`, `ContactsPage.reload` and `ContactsPage.open` start such
a full page load again; a request of the app itself cannot be replayed, hence one retry by default
(`E2E_RETRIES`). Playwright lists a test that passed on its retry as flaky: look at the
`_failureText` of its trace before blaming the app.
