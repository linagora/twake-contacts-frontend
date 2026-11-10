import { define } from 'rstack'
import fmt from 'rslint-config-cozy-app/fmt'
import react from 'rslint-config-cozy-app/react'

// The window globals of .env.js, appList.js and index.html (CONFIG_SCHEMA)
const RUNTIME_SETTINGS = [
  'SSO_BASE_URL',
  'SSO_CLIENT_ID',
  'SSO_SCOPE',
  'SSO_REDIRECT_URI',
  'SSO_RESPONSE_TYPE',
  'SSO_CODE_CHALLENGE_METHOD',
  'SSO_POST_LOGOUT_REDIRECT',
  'SIDE_SERVICE_BASE_URL',
  'DAV_BASE_URL',
  'WEBSOCKET_URL',
  'CONTACTS_NS',
  'MAIL_SPA_URL',
  'CHAT_SPA_URL',
  'CALENDAR_SPA_URL',
  'WORKPLACE_FQDN_FALLBACK',
  'SUPPORT_URL',
  'appList',
  'SENTRY_DSN',
  'SENTRY_ENVIRONMENT',
  'APP_VERSION',
  'DEBUG',
  'LANG'
]

define.lint(lint => [
  ...react(lint),
  {
    // common/src/config.ts is the only reader of the runtime configuration
    ignores: ['common/src/config.ts', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-properties': [
        'error',
        ...RUNTIME_SETTINGS.map(property => ({
          object: 'window',
          property,
          message: 'Read runtime settings from `config` (@common/config)'
        }))
      ]
    }
  },
  {
    rules: {
      'import/order': 'off',
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }]
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      // TO DO: Turn these back on
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/await-thenable': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/require-await': 'warn'
    }
  }
])

define.fmt({
  ...fmt,
  ignorePatterns: [
    // Markdown docs (formatting handled manually)
    '*.md',
    'public/.env.example.js'
  ]
})
