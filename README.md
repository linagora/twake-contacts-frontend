# Twake Contacts Frontend

![LOGO](public/contacts.svg)

## Goals

This project aims at serving a Single Page Application allowing a user to interact with its contacts.

This frontend application is built in a monorepo structure with Rsbuild, React, and TypeScript. It shares its
technical stack with [twake-calendar-frontend](https://github.com/linagora/twake-calendar-frontend), and interacts with:

- [twake-calendar-side-service](https://github.com/linagora/twake-calendar-side-service), the backend the app
  calls: user profile and configuration, people search, contact search, vCard import, and the websocket pushing
  the changes of the address books.
- [esn-sabre](https://github.com/linagora/esn-sabre/) CalDAV + CardDAV server, tailor made for LINAGORA needs,
  reached through the side service for the address books and their contacts.

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before changing the store, the listings or the data access.
The end-to-end tests are described in [`e2e/README.md`](e2e/README.md).

---

## Project Structure

The repository is organized as a monorepo workspace:

- **[`apps/private`](apps/private)**: The main private contacts application. Accessible by authenticated users.
- **[`common`](common)**: Shared components, hooks, store, data access, translation locales, and utility functions.
- **[`e2e`](e2e)**: Playwright end-to-end tests against a real backend, see [`e2e/README.md`](e2e/README.md).
- **[`docs`](docs)**: [architecture](docs/ARCHITECTURE.md) and [decision records](docs/adr).

---

## Frontend Routes

### Private App (`apps/private`)

| Route | Description |
|-------|-------------|
| `/` | Login handler |
| `/contacts` | My contacts: the contacts of every address book |
| `/contacts/new` | New contact, in the default address book |
| `/contacts/:addressBookId` | The contacts of an address book |
| `/contacts/:addressBookId/new` | New contact, in that address book |
| `/contacts/:addressBookId/:contactId` | A contact |
| `/contacts/:addressBookId/:contactId/edit` | Edit a contact |
| `/callback` | OIDC callback |
| `/error` | Error page |

Every `/contacts` route is nested in the contacts layout (sidebar and top bar), see
[`AppRoutes.tsx`](apps/private/src/AppRoutes.tsx).

---

## Contributing

### Formatting

We use `rs fmt` of [Rstack](https://rstack.rs), which runs [Prettier](https://prettier.io/), to keep code style consistent.
The formatting rules are set in `rstack.config.mjs`.

Before committing, format your files:

```bash
npm run fmt
```

---

## Running it

Requirement: **Node 24+**

First, install the dependencies from the root directory:

```bash
npm install
```

### Development Mode

To start the application in development mode:

```bash
npm run start:private
```

Runs the private app on [http://localhost:5000](http://localhost:5000).

### Production Build

To build the application for production, run:

```bash
npm run build
```

The production bundle will be compiled to `apps/private/dist`.

### Serving Locally

You can serve the built production assets locally using:

```bash
npm run serve:private
```

Serves on [http://localhost:5000](http://localhost:5000).

### Running Tests

Runs the Vitest unit tests (Node.js 24):

```bash
npm test
npm run test:watch
npm run test:coverage
```

### Linting

To run the [Rslint](https://rslint.rs) checks and the format check:

```bash
npm run lint
npm run lint:fmt
```

To automatically fix formatting and lint errors:

```bash
npm run lint:fix
```

---

## Running with Docker

First, build the application:

```bash
npm run build
```

Then build the Docker image:

```bash
docker build -f apps/private/Dockerfile -t linagora/twake-contacts-private .
```

To run the container, mount the `.env.js` configuration file from the root `public/` directory:

```bash
docker run -d \
  -v $PWD/public/.env.js:/usr/share/nginx/html/.env.js \
  -v $PWD/public/appList.js:/usr/share/nginx/html/appList.js \
  -p 5000:80 \
  linagora/twake-contacts-private
```

The pages are served with a `Content-Security-Policy` whose `frame-ancestors` defaults to `'self'`. When the app is embedded by the workplace on another origin, list the allowed parents in the `FRAME_ANCESTORS` environment variable of the container, for instance `-e FRAME_ANCESTORS="'self' https://*.twake.example.com"`.

---

## Configuring the Application

The application loads configuration dynamically at runtime from static JavaScript files in the `public` directory.

### Environment variables (`.env.js`)

1. Copy `public/.env.example.js` to `public/.env.js`
2. Customize the variables in `public/.env.js` to match your environment.

| Variable | Description |
|----------|-------------|
| `SSO_BASE_URL`, `SSO_CLIENT_ID`, `SSO_SCOPE`, `SSO_REDIRECT_URI`, `SSO_RESPONSE_TYPE`, `SSO_CODE_CHALLENGE_METHOD`, `SSO_POST_LOGOUT_REDIRECT` | OIDC provider settings |
| `SIDE_SERVICE_BASE_URL` | twake-calendar-side-service, the backend every call goes to |
| `WEBSOCKET_URL` | Websocket of the side service, pushing the changes of the address books |
| `DAV_BASE_URL` | Base URL displayed to users in the address book details |
| `CONTACTS_NS` | XML namespace of the esn-sabre contacts properties |
| `MAIL_SPA_URL`, `CHAT_SPA_URL`, `CALENDAR_SPA_URL` | Applications a contact can be reached from, see `.env.example.js` for the placeholders |
| `WORKPLACE_FQDN_FALLBACK` | Workplace used when the OIDC provider exposes none |
| `SUPPORT_URL` | Optional help link of the Twake Bar |
| `DEBUG` | Disables the Nginx browser cache when `true` |
| `LANG` | Default language, overridden by the user configuration |
| `SENTRY_DSN` | Optional, omit to disable Sentry |

**Note**: `.env.js` is gitignored, so each environment can have its own configuration.

### Application list (`appList.js`)

Copy `public/appList.example.js` to `public/appList.js` and configure each
application's `name`, `link`, and `icon`. This file is loaded separately from
`.env.js` and supplies the Twake Bar's fallback application menu when the
workplace session is unavailable. `appList.js` is gitignored so each environment
can provide its own list.

---

## Credits

Developed with <3 at [LINAGORA](https://linagora.com) !
