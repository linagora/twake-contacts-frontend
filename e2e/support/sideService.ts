import type { Page, Request } from '@playwright/test'

import { env, stack } from './env'

const TOKENS = new WeakMap<Page, string>()

/** Records the bearer token of every request the app of this page sends to the side service */
export function trackBearerToken(page: Page): void {
  page.on('request', (request: Request) => {
    const authorization = request.headers()['authorization']
    if (
      request.url().startsWith(`${env.apiUrl}/`) &&
      authorization?.startsWith('Bearer ')
    ) {
      TOKENS.set(page, authorization)
    }
  })
}

/**
 * Calls to the side service on behalf of the signed-in user of a page. The app keeps its
 * tokens in memory, out of reach of the page's scripts: the token is read off the requests the
 * app sends (BearerTokens.java of the calendar e2e suite does the same).
 */
export class SideServiceClient {
  readonly #authorization: string

  private constructor(authorization: string) {
    this.#authorization = authorization
  }

  /** The client of the user signed in on this page, once the app has called the backend */
  static of(page: Page): SideServiceClient {
    const authorization = TOKENS.get(page)
    if (authorization === undefined) {
      throw new Error(
        'The app of this page has not called the side service yet'
      )
    }
    return new SideServiceClient(authorization)
  }

  async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<Response> {
    // the side service itself, not the nginx in front of it (http://api for the browser)
    return fetch(`http://${stack().sideService}:8080${path}`, {
      method,
      headers: {
        Authorization: this.#authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  }

  /** The account language (`en`, `fr`, `vi`, `ru`, `es`, `de`, `it`), which wins over `localStorage.lang` */
  async setLanguage(language: string): Promise<void> {
    const response = await this.request(
      'PATCH',
      '/api/configurations?scope=user',
      [
        {
          name: 'core',
          configurations: [{ name: 'language', value: language }]
        }
      ]
    )
    if (response.status !== 204) {
      throw new Error(
        `Setting the language to ${language}: ${response.status} ${await response.text()}`
      )
    }
  }

  /** The account theme (`light`, `dark`, `auto`), shared by the Twake apps */
  async setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    const response = await this.request(
      'PATCH',
      '/api/configurations?scope=user',
      [{ name: 'core', configurations: [{ name: 'theme', value: theme }] }]
    )
    if (response.status !== 204) {
      throw new Error(
        `Setting the theme to ${theme}: ${response.status} ${await response.text()}`
      )
    }
  }
}
