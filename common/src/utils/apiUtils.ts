import { Auth } from '@common/features/User/oidcAuth'
import ky, {
  type KyInstance,
  type KyRequest,
  type KyResponse,
  HTTPError,
  type NormalizedOptions
} from 'ky'
import {
  TokenEndpointResponse,
  TokenEndpointResponseHelpers
} from 'openid-client'

const RETRY_CONFIG = {
  maxRetries: 10
}

let isRedirectingToSso = false

const redirectSSO = async (
  response: KyResponse,
  request: KyRequest,
  options: NormalizedOptions
): Promise<void> => {
  if (isRedirectingToSso) {
    throw new DOMException('SSO redirect in progress', 'AbortError')
  }
  isRedirectingToSso = true
  try {
    const loginurl = await Auth()

    sessionStorage.setItem(
      'redirectState',
      JSON.stringify({
        code_verifier: loginurl.code_verifier,
        state: loginurl.state
      })
    )
    redirectTo(loginurl.redirectTo)
  } catch (error) {
    isRedirectingToSso = false
    console.error('SSO Redirect failed:', error)
    throw new HTTPError(response, request, options)
  }
}

const handleUnauthorizeRequest = async (
  response: KyResponse,
  request: KyRequest,
  options: NormalizedOptions
): Promise<KyResponse | void> => {
  // Check if we're already on login flow to prevent redirect loop
  const currentPath = window.location.pathname
  if (currentPath === '/callback') {
    return response
  }

  // Check if we have a token in the request
  const hasAuthHeader = request.headers.has('Authorization')
  if (!hasAuthHeader) {
    return response
  }

  // Only redirect to SSO if we're sure token is invalid (not just missing)
  await redirectSSO(response, request, options)
}

export const api: KyInstance = ky.extend({
  prefixUrl: window.SIDE_SERVICE_BASE_URL,
  retry: {
    limit: RETRY_CONFIG.maxRetries
  },
  hooks: {
    beforeRequest: [
      async (request: KyRequest): Promise<KyRequest> => {
        const headers = new Headers(request.headers)

        if (!headers.has('Authorization')) {
          const access_token = getStoredAccessToken()
          if (access_token) {
            headers.set('Authorization', `Bearer ${access_token}`)
          }
        }

        return new Request(request, { headers }) as KyRequest
      }
    ],
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
      async (request, options, response): Promise<KyResponse> => {
        if (response.status === 401) {
          await handleUnauthorizeRequest(response, request, options)
        }
        return response
      }
    ]
  }
})

function getStoredAccessToken(): string | null {
  const raw = sessionStorage.getItem('tokenSet')
  const saved = raw
    ? (JSON.parse(raw) as TokenEndpointResponse & TokenEndpointResponseHelpers)
    : null
  return saved?.access_token ?? null
}

export function redirectTo(url: URL): void {
  window.location.assign(url)
}

export function getLocation(): string {
  return window.location.href
}

export function isValidUrl(string?: string): URL | boolean {
  let url

  try {
    url = new URL(string ?? '')
  } catch {
    return false
  }
  return url
}
