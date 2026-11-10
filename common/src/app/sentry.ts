import * as Sentry from '@sentry/react'

/**
 * Initializes Sentry if window.SENTRY_DSN is configured.
 *
 * Events carry the build version (the release tag or `sha-<8>`) written to
 * version.js by apps/private/Dockerfile, matching the Sentry release of the
 * uploaded source maps.
 */
export function initSentry(): void {
  if (window.SENTRY_DSN) {
    Sentry.init({
      dsn: window.SENTRY_DSN,
      release: window.APP_VERSION,
      integrations: [
        Sentry.captureConsoleIntegration({ levels: ['warn', 'error'] })
      ]
    })
  }
}
