import { define } from 'rstack'
import fmt from 'rslint-config-cozy-app/fmt'
import react from 'rslint-config-cozy-app/react'

define.lint(lint => [
  ...react(lint),
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
