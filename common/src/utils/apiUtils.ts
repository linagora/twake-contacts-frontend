import { addAuthorization, redirectOnUnauthorized } from '@linagora/twake-oidc'
import ky, { type KyInstance } from 'ky'

// Keep the worst case short: a failing request must surface its error to the
// user within seconds, not after minutes of silent exponential backoff.
const RETRY_CONFIG = {
  maxRetries: 3,
  backoffLimitMs: 2000,
  maxRetryAfterMs: 3000
}

export const api: KyInstance = ky.extend({
  prefix: window.SIDE_SERVICE_BASE_URL,
  retry: {
    limit: RETRY_CONFIG.maxRetries,
    backoffLimit: RETRY_CONFIG.backoffLimitMs,
    maxRetryAfter: RETRY_CONFIG.maxRetryAfterMs
  },
  hooks: {
    // twake-oidc hooks still have the positional signature of ky 1
    beforeRequest: [({ request }): void => addAuthorization(request)],
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
    afterResponse: [
      ({ request, options, response }): Promise<void> =>
        redirectOnUnauthorized(request, options, response)
    ]
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
