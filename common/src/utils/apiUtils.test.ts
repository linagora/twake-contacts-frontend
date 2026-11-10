import { addAuthorization, redirectOnUnauthorized } from '@linagora/twake-oidc'
import type { KyInstance } from 'ky'

vi.mock('@linagora/twake-oidc', () => ({
  addAuthorization: vi.fn(),
  redirectOnUnauthorized: vi.fn()
}))

describe('api', () => {
  let api: KyInstance
  let API_POLICY: typeof import('./apiUtils').API_POLICY
  const fetchSpy = vi.spyOn(globalThis, 'fetch')

  const sentRequest = (): Request => fetchSpy.mock.calls[0][0] as Request

  beforeAll(async () => {
    Object.assign(globalThis, {
      window: { SIDE_SERVICE_BASE_URL: 'https://contacts.example.com/services' }
    })
    ;({ api, API_POLICY } = await import('./apiUtils'))
  })

  beforeEach(() => {
    fetchSpy.mockImplementation(() =>
      Promise.resolve(Response.json({ ok: true }))
    )
  })

  afterAll(() => {
    fetchSpy.mockRestore()
    Object.assign(globalThis, { window: undefined })
  })

  it('prefixes requests with the side service URL', async () => {
    await api.get('api/user').json()

    expect(sentRequest().url).toBe(
      'https://contacts.example.com/services/api/user'
    )
  })

  it('lets twake-oidc authorize the outgoing request', async () => {
    vi.mocked(addAuthorization).mockImplementation(request =>
      request.headers.set('Authorization', 'Bearer token')
    )

    await api.get('api/user').json()

    expect(sentRequest().headers.get('Authorization')).toBe('Bearer token')
  })

  it('lets twake-oidc handle the response of the request', async () => {
    fetchSpy.mockImplementation(() =>
      Promise.resolve(new Response('{}', { status: 401 }))
    )

    await expect(api.get('api/user')).rejects.toMatchObject({
      response: { status: 401 }
    })

    expect(redirectOnUnauthorized).toHaveBeenCalledTimes(1)
    const [request, , response] = vi.mocked(redirectOnUnauthorized).mock
      .calls[0]
    expect(request.url).toBe('https://contacts.example.com/services/api/user')
    expect(response.status).toBe(401)
  })

  describe('retry policy', () => {
    const failWith = (status: number): void => {
      fetchSpy.mockImplementation(() =>
        Promise.resolve(new Response('{}', { status }))
      )
    }

    it('retries a failing read twice, then surfaces the error', async () => {
      const info = vi.spyOn(console, 'info').mockImplementation(() => {})
      const warn = vi.spyOn(console, 'warn')
      failWith(503)

      await expect(api.get('api/user')).rejects.toMatchObject({
        response: { status: 503 }
      })

      expect(fetchSpy).toHaveBeenCalledTimes(3)
      expect(info).toHaveBeenCalledTimes(2)
      expect(warn).not.toHaveBeenCalled()
    })

    it.each(['delete', 'put', 'post'] as const)(
      'does not replay a %s',
      async method => {
        failWith(503)

        await expect(api[method]('dav/card.vcf')).rejects.toMatchObject({
          response: { status: 503 }
        })

        expect(fetchSpy).toHaveBeenCalledTimes(1)
      }
    )

    it('does not retry a server error that a retry would not fix', async () => {
      failWith(500)

      await expect(api.get('api/user')).rejects.toMatchObject({
        response: { status: 500 }
      })

      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('bounds each attempt and the backoff', () => {
      expect(API_POLICY.timeout).toBe(15_000)
      expect(API_POLICY.retry.limit).toBeLessThanOrEqual(3)
      expect(API_POLICY.retry.backoffLimit).toBe(3_000)
    })
  })
})
