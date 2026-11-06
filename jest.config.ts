import type { Config } from 'jest'

// Set timezone to UTC for consistent test results across all environments
process.env.TZ = 'UTC'

// Twake MUI's Markdown exports load these ESM packages even in tests that
// only import other components. Transform the Markdown dependency tree in both projects.
const markdownEsmPackages = [
  '@ungap/structured-clone',
  'react-markdown',
  'remark-[^/]+',
  'unified',
  'mdast-util-[^/]+',
  'micromark(?:-[^/]+)?',
  'unist-util-[^/]+',
  'hast-util-[^/]+',
  'vfile(?:-message)?',
  'bail',
  'ccount',
  'character-entities(?:-[^/]+)?',
  'character-reference-invalid',
  'comma-separated-tokens',
  'decode-named-character-reference',
  'devlop',
  'estree-util-is-identifier-name',
  'escape-string-regexp',
  'html-url-attributes',
  'is-alphabetical',
  'is-alphanumerical',
  'is-decimal',
  'is-hexadecimal',
  'is-plain-obj',
  'longest-streak',
  'markdown-table',
  'parse-entities',
  'property-information',
  'space-separated-tokens',
  'stringify-entities',
  'trim-lines',
  'trough',
  'zwitch'
].join('|')

// React Router v8 and its dependencies are ESM.
const routerEsmPackages = 'react-router|@remix-run/route-pattern|cookie-es'

const config: Config = {
  collectCoverage: false,
  coverageDirectory: 'coverage',
  passWithNoTests: true,
  projects: [
    {
      displayName: 'dom',
      clearMocks: true,
      moduleFileExtensions: [
        'js',
        'mjs',
        'cjs',
        'jsx',
        'ts',
        'tsx',
        'json',
        'node'
      ],
      testEnvironment: 'jsdom',
      testMatch: ['**/*.test.tsx'],
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      testTimeout: 15000,
      transform: {
        '^.+\\.([jt]sx?|mjs)$': 'babel-jest',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          '<rootDir>/fileTransformer.ts'
      },
      transformIgnorePatterns: [
        `/node_modules/(?!(${markdownEsmPackages}|${routerEsmPackages}|ky|@linagora/twake-bar|@linagora/twake-sdk|@linagora/twake-mui|@linagora/twake-icons|@linagora/twake-utils|@linagora/twake-oidc|mime|domhandler|htmlparser2|domutils|entities|domelementtype|dom-serializer)/)`
      ],

      moduleNameMapper: {
        '^react$': '<rootDir>/node_modules/react',
        '^react-dom$': '<rootDir>/node_modules/react-dom',
        '^@injected/(.*)$': '<rootDir>/apps/private/src/$1',
        '^@/common/(.*)$': '<rootDir>/common/src/$1',
        '^@common/(.*)$': '<rootDir>/common/src/$1',
        '^@private/(.*)$': '<rootDir>/apps/private/src/$1',
        '^@linagora/twake-mui$': '<rootDir>/node_modules/@linagora/twake-mui',
        '^@linagora/twake-icons$':
          '<rootDir>/node_modules/@linagora/twake-icons',
        '^@linagora/twake-utils$':
          '<rootDir>/node_modules/@linagora/twake-utils',
        '^@linagora/twake-oidc$': '<rootDir>/node_modules/@linagora/twake-oidc'
      },
      setupFilesAfterEnv: ['<rootDir>/common/src/setupTests.ts']
    },
    {
      displayName: 'node',
      clearMocks: true,
      moduleFileExtensions: [
        'js',
        'mjs',
        'cjs',
        'jsx',
        'ts',
        'tsx',
        'json',
        'node'
      ],
      testEnvironment: 'node',
      testMatch: ['**/*.test.ts'],
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      testTimeout: 15000,
      transform: {
        '^.+\\.([jt]sx?|mjs)$': 'babel-jest'
      },
      transformIgnorePatterns: [
        `/node_modules/(?!(${markdownEsmPackages}|${routerEsmPackages}|ky|@linagora/twake-bar|@linagora/twake-sdk|@linagora/twake-mui|@linagora/twake-icons|@linagora/twake-utils|@linagora/twake-oidc|domhandler|htmlparser2|domutils|entities|domelementtype|dom-serializer)/)`
      ],
      setupFilesAfterEnv: ['<rootDir>/common/src/setupTests.ts'],
      moduleNameMapper: {
        '^@/common/(.*)$': '<rootDir>/common/src/$1',
        '^@common/(.*)$': '<rootDir>/common/src/$1',
        '^@private/(.*)$': '<rootDir>/apps/private/src/$1',
        '^@linagora/twake-mui$': '<rootDir>/node_modules/@linagora/twake-mui',
        '^@linagora/twake-icons$':
          '<rootDir>/node_modules/@linagora/twake-icons',
        '^@linagora/twake-utils$':
          '<rootDir>/node_modules/@linagora/twake-utils',
        '^@linagora/twake-oidc$': '<rootDir>/node_modules/@linagora/twake-oidc'
      }
    }
  ]
}

export default config
