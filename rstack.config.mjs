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
  // Layers, see docs/ARCHITECTURE.md: common never depends on an app, and apps
  // reach the backend through the hooks and thunks of common, never its DAOs or ky
  {
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './common',
              from: './apps',
              message: 'common/ must not depend on an app.'
            },
            {
              target: './apps',
              from: './common/src/features/**/*Dao.ts',
              message:
                'Reach the backend through a hook or a thunk of common/, not a DAO.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['apps/**'],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'ky',
              message: 'Reach the backend through a hook or a thunk of common/.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['apps/**', 'common/src/**'],
    rules: {
      // The UI goes through the Twake UI kit only
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@mui/*'],
              message:
                'Import from @linagora/twake-mui or @linagora/twake-icons instead.'
            }
          ]
        }
      ]
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
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true
        }
      ],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/require-await': 'error'
    }
  },
  {
    // the kind of an address book is decided by addressBookModel.ts alone
    files: ['apps/**/*.ts', 'apps/**/*.tsx'],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^(dab|domain-members|collected)$/]',
          message: 'Use book.kind / book.capabilities'
        }
      ]
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
