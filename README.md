# Twake Contacts Frontend

![LOGO](public/contacts.svg)

## Goals

This project aims at serving a Single Page Application allowing a user to interact with its contacts.

This frontend application is built in a monorepo structure with Rsbuild, React, and TypeScript. It shares its
technical stack with [twake-calendar-frontend](https://github.com/linagora/twake-calendar-frontend), and interacts with:

- [esn-sabre](https://github.com/linagora/esn-sabre/) CalDAV + CardDAV server, tailor made for LINAGORA needs.
- An OpenPaaS / ESN backend, for the user profile, user configurations and the DAV JWT.

---

## Project Structure

The repository is organized as a monorepo workspace:

- **[`apps/private`](apps/private)**: The main private contacts application. Accessible by authenticated users.
- **[`common`](common)**: Shared components, hooks, translation locales, and utility functions.

---

## Frontend Routes

### Private App (`apps/private`)

| Route | Description |
|-------|-------------|
| `/` | Login handler |
| `/contacts` | Main contacts view (authenticated) |
| `/callback` | OAuth callback |
| `/error` | Error page |

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

The settings are validated at startup by `common/src/config.ts`: when a
**required** setting is missing, or any setting is malformed, the app shows a
page naming it instead of starting. The table below is generated from that schema: update it
with `npm run config:doc` (a test fails when it drifts).

<!-- config:start -->
| Variable | Default | Description |
|----------|---------|-------------|
| `SSO_BASE_URL` | **required** | Absolute URL of the OIDC provider |
| `SSO_CLIENT_ID` | **required** | OIDC client id of the app |
| `SSO_SCOPE` | **required** | OIDC scopes, space separated. Add `workplaceFqdn` to let the Twake Bar find the workplace |
| `SSO_REDIRECT_URI` | **required** | Absolute URL the OIDC provider redirects to after login (`<app>/callback`) |
| `SSO_RESPONSE_TYPE` | `"code"` | OIDC response type |
| `SSO_CODE_CHALLENGE_METHOD` | `"S256"` | OIDC PKCE code challenge method |
| `SSO_POST_LOGOUT_REDIRECT` | optional | Absolute URL the OIDC provider redirects to after logout |
| `SIDE_SERVICE_BASE_URL` | **required** | Absolute URL of the contacts backend (side service), prefix of every API call |
| `DAV_BASE_URL` | optional | Base URL displayed to users in the address book details |
| `WEBSOCKET_URL` | optional | Base URL of the side service websocket (`wss://...`, or `https://...` converted to `wss://`). Live updates are disabled when omitted |
| `CONTACTS_NS` | `"http://open-paas.org/contacts"` | XML namespace of the contacts properties on the DAV server |
| `MAIL_SPA_URL` | optional | Mail app URL template (`{localpart}`, `{workplaceFqdn}`), target of the "Send email" actions. Hidden when omitted |
| `CHAT_SPA_URL` | optional | Chat app URL template (`{localpart}`, `{workplaceFqdn}`, `{workplaceFqdn.localpart}`, `{workplaceFqdn.domain}`, `{target}`), target of the "Open chat" actions. Hidden when omitted |
| `CALENDAR_SPA_URL` | optional | Calendar app URL template (`{localpart}`, `{workplaceFqdn}`), target of the "Create event" actions. Hidden when omitted |
| `WORKPLACE_FQDN_FALLBACK` | optional | Workplace FQDN template (`{localpart}`) used when the OIDC provider does not expose `workplaceFqdn` |
| `SUPPORT_URL` | optional | Help link of the Twake Bar when the workplace session is unavailable |
| `appList` | `[]` | Fallback applications of the Twake Bar (`{ name, link, icon }[]`), defined in `appList.js` |
| `SENTRY_DSN` | optional | Sentry DSN. Sentry is disabled when omitted |
| `SENTRY_ENVIRONMENT` | optional | Sentry environment of the reported events (e.g. `production`, `staging`) |
| `APP_VERSION` | optional | Version of the app, sent to Sentry as the release |
| `DEBUG` | `false` | Shows the theme toggle and disables the Nginx browser cache when `true` |
| `LANG` | `"en"` | Default language, overridden by the user configuration |
<!-- config:end -->

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
