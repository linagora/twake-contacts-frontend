import { addAuthorization, redirectOnUnauthorized } from '@linagora/twake-oidc'
import ky, { type KyInstance } from 'ky'

const RETRY_CONFIG = {
  maxRetries: 10
}

export const api: KyInstance = ky.extend({
  prefixUrl: window.SIDE_SERVICE_BASE_URL,
  retry: {
    limit: RETRY_CONFIG.maxRetries
  },
  hooks: {
    beforeRequest: [addAuthorization],
    beforeRetry: [
      ({ request, error, retryCount }): void => {
        console.warn(
          `[API Retry] Attempt ${retryCount}/${RETRY_CONFIG.maxRetries}`,
          {
            url: request.url,
            error: error?.message
          }
        )
      }
    ],
    afterResponse: [redirectOnUnauthorized]
  }
})

export function isValidUrl(string?: string): URL | boolean {
  let url

  try {
    url = new URL(string ?? '')
  } catch {
    return false
  }
  return url
}
