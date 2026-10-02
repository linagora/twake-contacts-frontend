
import path from 'path'
import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginStylus } from '@rsbuild/plugin-stylus'
import { pluginSvgr } from '@rsbuild/plugin-svgr'

import { getInjectedAliases } from '../../common/injectedAliases'
import {
  isSentryConfigured,
  setupSentryPlugin
} from '../../common/sentryBuildUtils'
import { injectedAliases } from './injectedAliases'

export default defineConfig({
  plugins: [pluginReact(), pluginStylus(), pluginSvgr()],
  html: {
    template: '../../public/index.html'
  },
  server: {
    port: 5000,
    historyApiFallback: true,
    publicDir: [{ name: '../../public' }]
  },
  source: {
    entry: {
      index: './src/index.tsx'
    }
  },
  output: {
    distPath: {
      root: 'dist'
    },
    minify: true,
    sourceMap: {
      js: isSentryConfigured() ? 'source-map' : false
    }
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
      forceSplitting: {
        mui: /node_modules\/(@mui|@emotion)/,
        sentry: /node_modules\/@sentry/
      }
    }
  },
  resolve: {
    aliasStrategy: 'prefer-alias',
    alias: {
      ...getInjectedAliases(__dirname, injectedAliases),
      '@': path.resolve(__dirname, './src'),
      '@common': path.resolve(__dirname, '../../common/src'),
      react: require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
      '@mui/material': require.resolve('@mui/material'),
      '@mui/system': require.resolve('@mui/system'),
      '@emotion/react': require.resolve('@emotion/react'),
      'twake-i18n': require.resolve('twake-i18n'),
      'react-router': require.resolve('react-router')
    }
  },
  tools: {
    rspack(_, { appendPlugins }) {
      setupSentryPlugin(appendPlugins, 'dist')
    }
  }
})
