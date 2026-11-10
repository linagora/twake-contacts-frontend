import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  CONFIG_SCHEMA,
  loadConfig,
  renderConfigTable,
  type ConfigName
} from './config'

const VALID_SOURCE = {
  SSO_BASE_URL: 'https://sso.example.com',
  SSO_CLIENT_ID: 'contacts',
  SSO_SCOPE: 'openid profile email',
  SSO_REDIRECT_URI: 'https://contacts.example.com/callback',
  SIDE_SERVICE_BASE_URL: 'https://api.example.com'
}

const REQUIRED: ConfigName[] = [
  'SSO_BASE_URL',
  'SSO_CLIENT_ID',
  'SSO_SCOPE',
  'SSO_REDIRECT_URI',
  'SIDE_SERVICE_BASE_URL'
]

const URL_SETTINGS: ConfigName[] = [
  'SSO_BASE_URL',
  'SSO_REDIRECT_URI',
  'SIDE_SERVICE_BASE_URL',
  'SSO_POST_LOGOUT_REDIRECT'
]

const without = (name: string): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(VALID_SOURCE).filter(([key]) => key !== name)
  )

describe('loadConfig', () => {
  it('accepts a configuration with the required settings only', () => {
    const { config, errors } = loadConfig(VALID_SOURCE)

    expect(errors).toEqual([])
    expect(config).toMatchObject(VALID_SOURCE)
  })

  it('requires exactly the settings without which the app cannot work', () => {
    const requiredNames = Object.entries(CONFIG_SCHEMA)
      .filter(([, setting]) => setting.required)
      .map(([name]) => name)

    expect(requiredNames).toEqual(REQUIRED)
  })

  it.each(REQUIRED)('reports %s as missing when it is absent', name => {
    expect(loadConfig(without(name)).errors).toEqual([
      { name, reason: 'missing' }
    ])
  })

  it.each(REQUIRED)('reports %s as missing when it is empty', name => {
    expect(loadConfig({ ...VALID_SOURCE, [name]: '' }).errors).toEqual([
      { name, reason: 'missing' }
    ])
  })

  it.each(URL_SETTINGS)(
    'reports %s as invalid when it is not an absolute URL',
    name => {
      expect(
        loadConfig({ ...VALID_SOURCE, [name]: 'contacts/api' }).errors
      ).toEqual([{ name, reason: 'invalid' }])
    }
  )

  it.each(URL_SETTINGS)(
    'reports %s as invalid when it is not http(s)',
    name => {
      expect(
        loadConfig({ ...VALID_SOURCE, [name]: 'javascript:alert(1)' }).errors
      ).toEqual([{ name, reason: 'invalid' }])
    }
  )

  it('reports every invalid setting at once', () => {
    expect(loadConfig({}).errors.map(({ name }) => name)).toEqual(REQUIRED)
  })

  it.each([
    ['SSO_RESPONSE_TYPE', 'code'],
    ['SSO_CODE_CHALLENGE_METHOD', 'S256'],
    ['CONTACTS_NS', 'http://open-paas.org/contacts'],
    ['DEBUG', false],
    ['LANG', 'en'],
    ['appList', []]
  ] as const)('defaults %s to %j', (name, defaultValue) => {
    expect(loadConfig(VALID_SOURCE).config[name]).toEqual(defaultValue)
  })

  it.each([
    'SSO_POST_LOGOUT_REDIRECT',
    'DAV_BASE_URL',
    'WEBSOCKET_URL',
    'MAIL_SPA_URL',
    'CHAT_SPA_URL',
    'CALENDAR_SPA_URL',
    'WORKPLACE_FQDN_FALLBACK',
    'SUPPORT_URL',
    'SENTRY_DSN',
    'SENTRY_ENVIRONMENT',
    'APP_VERSION'
  ] as const)('leaves the optional %s undefined when it is empty', name => {
    const { config, errors } = loadConfig({ ...VALID_SOURCE, [name]: '' })

    expect(errors).toEqual([])
    expect(config[name]).toBeUndefined()
  })

  it('keeps the URL templates of the other apps as they are', () => {
    const template =
      'https://{workplaceFqdn.localpart}-chat.{workplaceFqdn.domain}/#/chat/@{target}'

    expect(
      loadConfig({ ...VALID_SOURCE, CHAT_SPA_URL: template }).config
        .CHAT_SPA_URL
    ).toBe(template)
  })

  it.each([
    [true, true],
    ['true', true],
    ['false', false]
  ])('reads DEBUG = %j as %j', (raw, expected) => {
    expect(loadConfig({ ...VALID_SOURCE, DEBUG: raw }).config.DEBUG).toBe(
      expected
    )
  })

  it('reports a DEBUG that is not a boolean as invalid', () => {
    expect(loadConfig({ ...VALID_SOURCE, DEBUG: 'yes' }).errors).toEqual([
      { name: 'DEBUG', reason: 'invalid' }
    ])
  })

  it('reports an unsupported SSO_RESPONSE_TYPE as invalid', () => {
    expect(
      loadConfig({ ...VALID_SOURCE, SSO_RESPONSE_TYPE: 'token' }).errors
    ).toEqual([{ name: 'SSO_RESPONSE_TYPE', reason: 'invalid' }])
  })

  it('reads the application list', () => {
    const appList = [{ name: 'Mail', link: '/mail', icon: '/mail.svg' }]

    expect(loadConfig({ ...VALID_SOURCE, appList }).config.appList).toEqual(
      appList
    )
  })

  it('reports a malformed application list as invalid', () => {
    expect(
      loadConfig({ ...VALID_SOURCE, appList: [{ name: 'Mail' }] }).errors
    ).toEqual([{ name: 'appList', reason: 'invalid' }])
  })

  it('freezes the configuration', () => {
    const { config } = loadConfig({
      ...VALID_SOURCE,
      appList: [{ name: 'Mail', link: '/mail', icon: '/mail.svg' }]
    })

    expect(Object.isFrozen(config)).toBe(true)
    expect(Object.isFrozen(config.appList)).toBe(true)
    expect(Object.isFrozen(config.appList[0])).toBe(true)
  })

  it('ignores the globals that are not settings', () => {
    expect(
      Object.keys(loadConfig({ ...VALID_SOURCE, OTHER: 'value' }).config)
    ).toEqual(Object.keys(CONFIG_SCHEMA))
  })
})

describe('README configuration table', () => {
  const readme = readFileSync(
    path.resolve(import.meta.dirname, '../../README.md'),
    'utf8'
  )

  it('is generated from the schema (npm run config:doc)', () => {
    const table = /<!-- config:start -->\n([\s\S]*?)\n<!-- config:end -->/.exec(
      readme
    )?.[1]

    expect(table).toBe(renderConfigTable())
  })

  it('documents every setting', () => {
    const documented = Object.keys(CONFIG_SCHEMA).filter(name =>
      readme.includes(`| \`${name}\` |`)
    )

    expect(documented).toEqual(Object.keys(CONFIG_SCHEMA))
  })
})
