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

We use [Prettier](https://prettier.io/) to keep code style consistent.
A `.prettierrc` file is already included in the repo, so formatting rules are predefined.

Before committing, make sure you format your files either using your IDE Prettier extension or Prettier CLI.

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

Runs the private app on [http://localhost:5002](http://localhost:5002).

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

Serves on [http://localhost:5002](http://localhost:5002).

### Running Tests

Launches the Jest test runner:

```bash
npm test
```

### Linting

To run the ESLint checks:

```bash
npm run lint
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
  -p 5002:80 \
  linagora/twake-contacts-private
```

---

## Configuring the Application

The application loads configuration dynamically at runtime from static JavaScript files in the `public` directory.

### Environment variables (`.env.js`)

1. Copy `public/.env.example.js` to `public/.env.js`
2. Customize the variables in `public/.env.js` to match your environment.

| Variable | Description |
|----------|-------------|
| `SSO_BASE_URL`, `SSO_CLIENT_ID`, `SSO_SCOPE`, `SSO_REDIRECT_URI`, `SSO_RESPONSE_TYPE`, `SSO_CODE_CHALLENGE_METHOD`, `SSO_POST_LOGOUT_REDIRECT` | OIDC provider settings |
| `OPENPAAS_BASE_URL` | OpenPaaS / ESN backend, serving `/api/user`, `/api/configurations` and `/api/jwt/generate` |
| `DAV_BASE_URL` | Sabre DAV backend, serving the CardDAV address books |
| `DEBUG` | Disables the Nginx browser cache when `true` |
| `LANG` | Default language, overridden by the user configuration |
| `SENTRY_DSN` | Optional, omit to disable Sentry |

**Note**: `.env.js` is gitignored, so each environment can have its own configuration.

---

## Credits

Developed with <3 at [LINAGORA](https://linagora.com) !
