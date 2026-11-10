/**
 * The only reader of the runtime configuration: the `window` globals defined by
 * `.env.js`, `version.js` and `appList.js`. Every setting is declared once in
 * CONFIG_SCHEMA, validated once at startup, and exposed through the frozen
 * `config` object.
 *
 * This module has no import on purpose: scripts/print-config-doc.ts runs it
 * with plain Node to generate the README configuration table.
 */

export interface AppLink {
  readonly name: string
  readonly link: string
  readonly icon: string
}

type Parser<T> = (raw: unknown) => T | undefined

interface Setting<T> {
  readonly description: string
  readonly required: boolean
  readonly parse: Parser<T>
  readonly defaultValue: T
  readonly documentedDefault?: string
}

const isBlank = (raw: unknown): boolean =>
  raw === undefined || raw === null || raw === ''

const nonEmptyString: Parser<string> = raw =>
  typeof raw === 'string' && raw.trim() !== '' ? raw : undefined

const absoluteUrl: Parser<string> = raw => {
  const value = nonEmptyString(raw)
  if (value === undefined || !URL.canParse(value)) return undefined
  return ['http:', 'https:'].includes(new URL(value).protocol)
    ? value
    : undefined
}

const oneOf =
  <T extends string>(...values: readonly T[]): Parser<T> =>
  raw =>
    values.find(value => value === raw)

const boolean: Parser<boolean> = raw => {
  if (typeof raw === 'boolean') return raw
  if (raw === 'true') return true
  if (raw === 'false') return false
  return undefined
}

const isAppLink = (raw: unknown): raw is AppLink =>
  typeof raw === 'object' &&
  raw !== null &&
  ['name', 'link', 'icon'].every(
    key => typeof (raw as Record<string, unknown>)[key] === 'string'
  )

const appLinks: Parser<readonly AppLink[]> = raw =>
  Array.isArray(raw) && raw.every(isAppLink)
    ? Object.freeze(raw.map(app => Object.freeze({ ...app })))
    : undefined

const required = <T>(
  parse: Parser<T>,
  fallback: T,
  description: string
): Setting<T> => ({
  description,
  required: true,
  parse,
  defaultValue: fallback
})

const optional = <T>(
  parse: Parser<T>,
  description: string
): Setting<T | undefined> => ({
  description,
  required: false,
  parse,
  defaultValue: undefined
})

const withDefault = <T>(
  parse: Parser<T>,
  defaultValue: T,
  description: string
): Setting<T> => ({
  description,
  required: false,
  parse,
  defaultValue,
  documentedDefault: `\`${JSON.stringify(defaultValue)}\``
})

export const CONFIG_SCHEMA = {
  SSO_BASE_URL: required(absoluteUrl, '', 'Absolute URL of the OIDC provider'),
  SSO_CLIENT_ID: required(nonEmptyString, '', 'OIDC client id of the app'),
  SSO_SCOPE: required(
    nonEmptyString,
    '',
    'OIDC scopes, space separated. Add `workplaceFqdn` to let the Twake Bar find the workplace'
  ),
  SSO_REDIRECT_URI: required(
    absoluteUrl,
    '',
    'Absolute URL the OIDC provider redirects to after login (`<app>/callback`)'
  ),
  SSO_RESPONSE_TYPE: withDefault(oneOf('code'), 'code', 'OIDC response type'),
  SSO_CODE_CHALLENGE_METHOD: withDefault(
    oneOf('S256'),
    'S256',
    'OIDC PKCE code challenge method'
  ),
  SSO_POST_LOGOUT_REDIRECT: optional(
    absoluteUrl,
    'Absolute URL the OIDC provider redirects to after logout'
  ),
  SIDE_SERVICE_BASE_URL: required(
    absoluteUrl,
    '',
    'Absolute URL of the contacts backend (side service), prefix of every API call'
  ),
  DAV_BASE_URL: optional(
    nonEmptyString,
    'Base URL displayed to users in the address book details'
  ),
  WEBSOCKET_URL: optional(
    nonEmptyString,
    'Base URL of the side service websocket (`wss://...`, or `https://...` converted to `wss://`). Live updates are disabled when omitted'
  ),
  CONTACTS_NS: withDefault(
    nonEmptyString,
    'http://open-paas.org/contacts',
    'XML namespace of the contacts properties on the DAV server'
  ),
  MAIL_SPA_URL: optional(
    nonEmptyString,
    'Mail app URL template (`{localpart}`, `{workplaceFqdn}`), target of the "Send email" actions. Hidden when omitted'
  ),
  CHAT_SPA_URL: optional(
    nonEmptyString,
    'Chat app URL template (`{localpart}`, `{workplaceFqdn}`, `{workplaceFqdn.localpart}`, `{workplaceFqdn.domain}`, `{target}`), target of the "Open chat" actions. Hidden when omitted'
  ),
  CALENDAR_SPA_URL: optional(
    nonEmptyString,
    'Calendar app URL template (`{localpart}`, `{workplaceFqdn}`), target of the "Create event" actions. Hidden when omitted'
  ),
  WORKPLACE_FQDN_FALLBACK: optional(
    nonEmptyString,
    'Workplace FQDN template (`{localpart}`) used when the OIDC provider does not expose `workplaceFqdn`'
  ),
  SUPPORT_URL: optional(
    nonEmptyString,
    'Help link of the Twake Bar when the workplace session is unavailable'
  ),
  appList: withDefault(
    appLinks,
    Object.freeze([]) as readonly AppLink[],
    'Fallback applications of the Twake Bar (`{ name, link, icon }[]`), defined in `appList.js`'
  ),
  SENTRY_DSN: optional(
    nonEmptyString,
    'Sentry DSN. Sentry is disabled when omitted'
  ),
  SENTRY_ENVIRONMENT: optional(
    nonEmptyString,
    'Sentry environment of the reported events (e.g. `production`, `staging`)'
  ),
  APP_VERSION: optional(
    nonEmptyString,
    'Version of the app, sent to Sentry as the release'
  ),
  DEBUG: withDefault(
    boolean,
    false,
    'Shows the theme toggle and disables the Nginx browser cache when `true`'
  ),
  LANG: withDefault(
    nonEmptyString,
    'en',
    'Default language, overridden by the user configuration'
  )
} as const

type Schema = typeof CONFIG_SCHEMA
export type ConfigName = keyof Schema
type SettingValue<S> = S extends Setting<infer T> ? T : never

export type Config = {
  readonly [Name in ConfigName]: SettingValue<Schema[Name]>
}

export interface ConfigError {
  readonly name: ConfigName
  readonly reason: 'missing' | 'invalid'
}

export interface LoadedConfig {
  readonly config: Config
  readonly errors: readonly ConfigError[]
}

const CONFIG_NAMES = Object.keys(CONFIG_SCHEMA) as ConfigName[]

type ConfigSource = Readonly<Record<string, unknown>>

const readSetting = (
  name: ConfigName,
  source: ConfigSource
): { value: unknown; error?: ConfigError } => {
  const setting: Setting<unknown> = CONFIG_SCHEMA[name]
  const raw = source[name]
  if (isBlank(raw)) {
    return setting.required
      ? { value: setting.defaultValue, error: { name, reason: 'missing' } }
      : { value: setting.defaultValue }
  }
  const value = setting.parse(raw)
  return value === undefined
    ? { value: setting.defaultValue, error: { name, reason: 'invalid' } }
    : { value }
}

const defaultSource = (): ConfigSource =>
  typeof window === 'undefined' ? {} : (window as unknown as ConfigSource)

/**
 * Validates every setting of `source`. A setting in error falls back to its
 * default, so that `config` stays usable while the error page is displayed.
 */
export function loadConfig(
  source: ConfigSource = defaultSource()
): LoadedConfig {
  const settings = CONFIG_NAMES.map(name => ({
    name,
    ...readSetting(name, source)
  }))
  return Object.freeze({
    config: Object.freeze(
      Object.fromEntries(settings.map(({ name, value }) => [name, value]))
    ) as Config,
    errors: Object.freeze(
      settings.flatMap(({ error }) => (error ? [error] : []))
    )
  })
}

export const { config, errors: configErrors } = loadConfig()

const documentedDefault = (setting: Setting<unknown>): string => {
  if (setting.required) return '**required**'
  return setting.documentedDefault ?? 'optional'
}

/** The README configuration table, generated from CONFIG_SCHEMA. */
export function renderConfigTable(): string {
  const rows = CONFIG_NAMES.map(name => {
    const setting: Setting<unknown> = CONFIG_SCHEMA[name]
    return `| \`${name}\` | ${documentedDefault(setting)} | ${setting.description} |`
  })
  return [
    '| Variable | Default | Description |',
    '|----------|---------|-------------|',
    ...rows
  ].join('\n')
}
