import path from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Keep date-sensitive tests consistent locally and in CI.
process.env.TZ = 'UTC'

const fromRoot = (file: string): string =>
  path.resolve(import.meta.dirname, file)

// Preserve the asset filenames used by existing component assertions.
const assetsAsBasename = (): Plugin => ({
  name: 'assets-as-basename',
  enforce: 'pre',
  load(id) {
    if (
      /\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$/.test(
        id
      )
    ) {
      return `export default ${JSON.stringify(path.basename(id))}`
    }
  }
})

export default defineConfig({
  plugins: [assetsAsBasename()],
  resolve: {
    alias: [
      { find: '@/common', replacement: fromRoot('common/src') },
      { find: '@common', replacement: fromRoot('common/src') },
      { find: '@', replacement: fromRoot('apps/private/src') }
    ],
    dedupe: [
      'react',
      'react-dom',
      '@linagora/twake-mui',
      '@linagora/twake-icons',
      '@linagora/twake-utils',
      '@linagora/twake-oidc'
    ]
  },
  test: {
    globals: true,
    clearMocks: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: { TZ: 'UTC' },
    setupFiles: [fromRoot('common/src/setupTests.ts')],
    // These packages need Vite's handling of CSS and extensionless ESM imports.
    server: {
      deps: { inline: [/@linagora\/twake-/, /html-react-parser/, /mime/] }
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'json', 'lcov', 'clover']
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          environmentOptions: { jsdom: { url: 'http://localhost/' } },
          include: ['apps/**/*.test.tsx', 'common/**/*.test.tsx']
        }
      },
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'apps/**/*.test.ts',
            'common/**/*.test.ts',
            'scripts/**/*.test.ts'
          ]
        }
      }
    ]
  }
})
