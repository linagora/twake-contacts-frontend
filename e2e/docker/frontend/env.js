// Runtime configuration of the SPA in the e2e stack and the QA environment, copied over
// .env.js (Dockerfile.frontend).
//
// Every URL below is resolved by the browser through Chromium's --host-resolver-rules
// (e2e/support/env.ts, printed by scripts/qa-environment/start.sh), so the browser and the
// containers agree on one single set of URLs.
//
// The SPA is served as http://localhost:8099 -- a made up port, nothing is bound on the
// host -- because the OIDC PKCE challenge goes through crypto.subtle, which the browser only
// exposes in a secure context. `localhost` is trustworthy, `frontend` would not be.
// Port and client id are the ones registered in Dex (dex/config.yaml) and expected as the token
// audience by the side service (side-service/configuration.properties).
var SSO_BASE_URL = 'https://sso:5554'
var SSO_CLIENT_ID = 'twake-contacts'
var SSO_SCOPE = 'openid profile email'
var SSO_REDIRECT_URI = 'http://localhost:8099/callback'
var SSO_RESPONSE_TYPE = 'code'
var SSO_CODE_CHALLENGE_METHOD = 'S256'
var SSO_POST_LOGOUT_REDIRECT = 'http://localhost:8099?logout=1'
var SIDE_SERVICE_BASE_URL = 'http://api'
var DAV_BASE_URL = 'http://dav'
var CONTACTS_NS = 'http://open-paas.org/contacts'

// DEBUG=true also disables the nginx asset cache in the app image, which keeps
// re-runs against a rebuilt bundle honest.
var DEBUG = true
var LANG = 'en'

// Nothing answers on these: they only let the links to the other apps be checked
var MAIL_SPA_URL = 'http://mail.e2e.local'
var CHAT_SPA_URL = 'http://chat.e2e.local/#/chat/@{target}'
var CALENDAR_SPA_URL = 'http://calendar.e2e.local'
var WORKPLACE_FQDN_FALLBACK = '{localpart}.e2e.local'

// Not used by the e2e stack, listed for completeness (see README "Configuring the Application")
var WEBSOCKET_URL = ''
var SUPPORT_URL = ''
var SENTRY_DSN = ''
var SENTRY_ENVIRONMENT = ''
