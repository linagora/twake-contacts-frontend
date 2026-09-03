import type { Config } from 'jest'

// Set timezone to UTC for consistent test results across all environments
process.env.TZ = 'UTC'

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
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.base.json' }],
        '^.+\\.(js|jsx|mjs)$': 'babel-jest',
        '^.+\\.(css|scss|sass|less|styl|stylus)$':
          'jest-preview/transforms/css',
        '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)':
          'jest-preview/transforms/file',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          '<rootDir>/fileTransformer.ts'
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(ky|@linagora/twake-mui|@linagora/twake-icons|mime|domhandler|htmlparser2|domutils|entities|domelementtype|dom-serializer)/)'
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
          '<rootDir>/node_modules/@linagora/twake-icons'
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
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.base.json' }],
        '^.+\\.(js|jsx|mjs)$': 'babel-jest'
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(ky|@linagora/twake-mui|@linagora/twake-icons|domhandler|htmlparser2|domutils|entities|domelementtype|dom-serializer)/)'
      ],
      setupFilesAfterEnv: ['<rootDir>/common/src/setupTests.ts'],
      moduleNameMapper: {
        '^@/common/(.*)$': '<rootDir>/common/src/$1',
        '^@common/(.*)$': '<rootDir>/common/src/$1',
        '^@private/(.*)$': '<rootDir>/apps/private/src/$1',
        '^@linagora/twake-mui$': '<rootDir>/node_modules/@linagora/twake-mui',
        '^@linagora/twake-icons$':
          '<rootDir>/node_modules/@linagora/twake-icons'
      }
    }
  ]
}

export default config
