import { createSdk, type Sdk } from '@linagora/twake-sdk'

// Keep one client per platform: its refreshed credentials outlive the ID token.
interface SdkSession {
  sdk: Sdk
  signingIn: Promise<void> | null
}

const sessions = new Map<string, SdkSession>()

const getSession = (platformURL: string): SdkSession => {
  let session = sessions.get(platformURL)
  if (!session) {
    session = { sdk: createSdk({ platformURL }), signingIn: null }
    sessions.set(platformURL, session)
  }
  return session
}

export const getPlatformSdk = (platformURL: string): Sdk =>
  getSession(platformURL).sdk

export async function ensureSdkSignedIn(
  platformURL: string,
  idToken: string
): Promise<Sdk> {
  const session = getSession(platformURL)
  if (session.sdk.status !== 'ready') {
    session.signingIn ??= session.sdk.login(idToken).finally(() => {
      session.signingIn = null
    })
    await session.signingIn
  }
  return session.sdk
}
