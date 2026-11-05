import { addAuthorization, redirectOnUnauthorized } from '@linagora/twake-oidc'
import ky, { type KyInstance } from 'ky'

const RETRY_CONFIG = {
  maxRetries: 10
}

export const api: KyInstance = ky.extend({
  prefix: window.SIDE_SERVICE_BASE_URL,
  retry: {
    limit: RETRY_CONFIG.maxRetries
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
