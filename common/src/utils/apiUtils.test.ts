import { addAuthorization, redirectOnUnauthorized } from '@linagora/twake-oidc'
import type { KyInstance } from 'ky'

vi.mock('@linagora/twake-oidc', () => ({
  addAuthorization: vi.fn(),
  redirectOnUnauthorized: vi.fn()
}))

describe('api', () => {
  let api: KyInstance
  const fetchSpy = vi.spyOn(globalThis, 'fetch')

  const sentRequest = (): Request => fetchSpy.mock.calls[0][0] as Request

  beforeAll(async () => {
    Object.assign(globalThis, {
      window: { SIDE_SERVICE_BASE_URL: 'https://contacts.example.com/services' }
    })
    ;({ api } = await import('./apiUtils'))
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

  describe('retries', () => {
    beforeEach(() => {
      fetchSpy.mockClear()
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('gives up on a failing request after a few seconds', async () => {
      vi.useFakeTimers()
      fetchSpy.mockImplementation(() =>
        Promise.resolve(new Response('{}', { status: 500 }))
      )

      const failure = expect(
        api.delete('dav/addressbooks/x')
      ).rejects.toMatchObject({ response: { status: 500 } })
      await vi.advanceTimersByTimeAsync(5000)
      await failure

      expect(fetchSpy).toHaveBeenCalledTimes(4)
    })

    it('caps the delay requested by a Retry-After header', async () => {
      vi.useFakeTimers()
      fetchSpy.mockImplementation(() =>
        Promise.resolve(
          new Response('{}', {
            status: 503,
            headers: { 'Retry-After': '3600' }
          })
        )
      )

      const failure = expect(api.get('api/user')).rejects.toMatchObject({
        response: { status: 503 }
      })
      await vi.advanceTimersByTimeAsync(10000)
      await failure

      expect(fetchSpy).toHaveBeenCalledTimes(4)
    })
  })
})
