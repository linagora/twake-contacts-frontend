var SSO_BASE_URL = 'https://example.com'
var SSO_CLIENT_ID = 'example'
var SSO_SCOPE = 'openid profile email'
var SSO_REDIRECT_URI = 'https://example.com/callback'
var SSO_RESPONSE_TYPE = 'code'
var SSO_CODE_CHALLENGE_METHOD = 'S256'
var SSO_POST_LOGOUT_REDIRECT = 'http://example.com?logout=1'
var SIDE_SERVICE_BASE_URL = 'https://openpaas.example.com'
var DAV_BASE_URL = 'https://dav.example.com'
var CONTACTS_NS = 'http://open-paas.org/contacts'
var DEBUG = false
var LANG = 'en'

// Base URL for the mail application composer.
// Supports {localpart} and {workplaceFqdn} placeholders.
// The contact email is appended as: /mailto/?uri=mailto:{email}
//
// Examples:
//   var MAIL_SPA_URL = 'https://mail.example.com';
//   var MAIL_SPA_URL = 'https://mail.{workplaceFqdn}';
//
var MAIL_SPA_URL = 'https://mail.example.com';


// Base URL for the chat application.
// Supports RFC 6570-style expressions:
//   {localpart}               - current user's local part (from email)
//   {workplaceFqdn}           - full workplace FQDN (e.g. alice.twake.example.com)
//   {workplaceFqdn.localpart} - first label of FQDN (e.g. alice)
//   {workplaceFqdn.domain}    - FQDN without first label (e.g. twake.example.com)
//   {target}                  - target user (Matrix ID or email), URL-encoded
//
// Example:
//   var CHAT_SPA_URL = 'https://{workplaceFqdn.localpart}-chat.{workplaceFqdn.domain}/#/bridge/web/#/chat/@{target}:{workplaceFqdn.domain}';
//
var CHAT_SPA_URL = 'https://{workplaceFqdn.localpart}-chat.{workplaceFqdn.domain}/#/bridge/web/#/chat/@{target}:{workplaceFqdn.domain}';

// Base URL for the calendar application.
// Supports the same placeholders as MAIL_SPA_URL.
//
// Example:
//   var CALENDAR_SPA_URL = 'https://calendar.example.com';
//   var CALENDAR_SPA_URL = 'https://'https://{workplaceFqdn.localpart}-calendar.{workplaceFqdn.domain}';
//
var CALENDAR_SPA_URL = 'https://calendar.example.com';

// ============================================
// Workplace FQDN Fallback (optional)
// ============================================
// Fallback used when the OIDC provider does not expose a workplace FQDN.
// Supports {localpart} expression.
//
// Examples:
//   var WORKPLACE_FQDN_FALLBACK = '{localpart}.twake.example.com';
//   var WORKPLACE_FQDN_FALLBACK = 'twake.example.com';
//
var WORKPLACE_FQDN_FALLBACK = '{localpart}.twake.example.com';
