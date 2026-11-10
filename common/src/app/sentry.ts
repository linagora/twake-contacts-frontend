import { config } from '@common/config'
import * as Sentry from '@sentry/react'

/**
 * Initializes Sentry if SENTRY_DSN is configured.
 *
 * Events carry the build version (the release tag or `sha-<8>`) written to
 * version.js by apps/private/Dockerfile, matching the Sentry release of the
 * uploaded source maps.
 */
export function initSentry(): void {
  if (config.SENTRY_DSN) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      release: config.APP_VERSION,
      environment: config.SENTRY_ENVIRONMENT,
      integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })]
    })
  }
}
