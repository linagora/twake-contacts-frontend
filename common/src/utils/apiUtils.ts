import { config } from '@common/config'
import { addAuthorization, redirectOnUnauthorized } from '@linagora/twake-oidc'
import ky, { type KyInstance } from 'ky'

/**
 * Only reads are retried: a write is never replayed automatically, the user
 * retries it from the error notification. With the backend down, an error
 * surfaces after at most 3 attempts of 15 s plus about 1 s of backoff.
 */
export const API_POLICY = {
  timeout: 15_000,
  retry: {
    limit: 2,
    methods: ['get', 'head', 'options'],
    statusCodes: [408, 429, 502, 503, 504],
    backoffLimit: 3_000
  }
} as const

export const api: KyInstance = ky.extend({
  prefix: config.SIDE_SERVICE_BASE_URL,
  timeout: API_POLICY.timeout,
  retry: API_POLICY.retry,
  hooks: {
    // twake-oidc hooks still have the positional signature of ky 1
    beforeRequest: [({ request }): void => addAuthorization(request)],
    beforeRetry: [
      ({ request, error, retryCount }): void => {
        // info, not warn: Sentry only captures console errors
        console.info(
          `[API Retry] Attempt ${retryCount}/${API_POLICY.retry.limit}`,
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
