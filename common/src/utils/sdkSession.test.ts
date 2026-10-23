import { createSdk, type Sdk } from '@linagora/twake-sdk'
import { ensureSdkSignedIn, getPlatformSdk } from './sdkSession'

jest.mock('@linagora/twake-sdk', () => ({ createSdk: jest.fn() }))

describe('SDK session', () => {
  it('shares a concurrent token exchange and keeps a ready client', async () => {
    let resolveLogin!: () => void
    const login = jest.fn(
      () =>
        new Promise<void>(resolve => {
          resolveLogin = resolve
        })
    )
    const sdk = { status: 'waiting', login } as unknown as Sdk
    jest.mocked(createSdk).mockReturnValueOnce(sdk)

    const first = ensureSdkSignedIn('https://alice.twake.app', 'id-token')
    const second = ensureSdkSignedIn('https://alice.twake.app', 'id-token')
    expect(login).toHaveBeenCalledTimes(1)
    expect(getPlatformSdk('https://alice.twake.app')).toBe(sdk)

    Object.assign(sdk, { status: 'ready' })
    resolveLogin()
    await expect(first).resolves.toBe(sdk)
    await expect(second).resolves.toBe(sdk)
    await ensureSdkSignedIn('https://alice.twake.app', 'expired-id-token')
    expect(login).toHaveBeenCalledTimes(1)
  })

  it('isolates platforms and permits retrying a rejected exchange', async () => {
    const login = jest
      .fn()
      .mockRejectedValueOnce(new Error('refused'))
      .mockResolvedValueOnce(undefined)
    const sdk = { status: 'public', login } as unknown as Sdk
    jest.mocked(createSdk).mockReturnValueOnce(sdk)
    await expect(
      ensureSdkSignedIn('https://bob.twake.app', 'id-token')
    ).rejects.toThrow('refused')
    await expect(
      ensureSdkSignedIn('https://bob.twake.app', 'new-token')
    ).resolves.toBe(sdk)
    expect(login).toHaveBeenCalledTimes(2)
    expect(getPlatformSdk('https://alice.twake.app')).not.toBe(sdk)
  })
})
