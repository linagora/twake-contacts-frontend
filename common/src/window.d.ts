export {}

declare global {
  interface Window {
    SSO_BASE_URL: string
    SSO_CLIENT_ID: string
    SSO_SCOPE: string
    SSO_REDIRECT_URI: string
    SSO_RESPONSE_TYPE: 'code'
    SSO_CODE_CHALLENGE_METHOD: 'S256'
    SSO_POST_LOGOUT_REDIRECT: string

    SIDE_SERVICE_BASE_URL: string
    DAV_BASE_URL: string

    SENTRY_DSN: string | undefined

    APP_VERSION: string

    DEBUG: boolean
    LANG: string

    CONTACTS_NS: string | undefined

    CHAT_SPA_URL: string | undefined
    MAIL_SPA_URL: string | undefined
    WORKPLACE_FQDN_FALLBACK: string | undefined
  }
}
