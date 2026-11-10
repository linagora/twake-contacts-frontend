import { config } from '@common/config'
import * as Sentry from '@sentry/react'

/**
 * Initializes Sentry if SENTRY_DSN is configured.
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
