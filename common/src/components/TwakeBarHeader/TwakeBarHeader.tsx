import { useAppSelector } from '@common/app/hooks'
import { selectPlatformURL } from '@common/app/selectors/selectPlatformURL'
import type { userData } from '@common/features/User/userDataTypes'
import { ensureSdkSignedIn, getPlatformSdk } from '@common/utils/sdkSession'
import {
  SdkProvider,
  TwakeBar,
  type TwakeBarFallback
} from '@linagora/twake-bar'
import { logOut } from '@linagora/twake-oidc'
import { useEffect, useMemo } from 'react'
import { useI18n } from 'twake-i18n'

const handleLogOut = (): void => void logOut()

const createBarFallback = (user: userData): TwakeBarFallback => ({
  helpLink: window.SUPPORT_URL,
  apps: (window.appList ?? []).map(app => ({
    name: app.name,
    href: app.link,
    icon: app.icon
  })),
  user: user.email
    ? {
        name:
          user.name ||
          [user.given_name, user.family_name].filter(Boolean).join(' ') ||
          user.email,
        email: user.email
      }
    : undefined
})

export const TwakeBarHeader = (): JSX.Element | null => {
  const isLoading = useAppSelector(state => state.loading.isLoading)
  const user = useAppSelector(state => state.user.userData)
  const idToken = useAppSelector(state => state.user.tokens?.id_token)
  const platformURL = useAppSelector(selectPlatformURL)
  const { t } = useI18n()

  useEffect(() => {
    if (!platformURL || !idToken) return
    // A refused token exchange leaves the SDK public and the fallbacks usable.
    void ensureSdkSignedIn(platformURL, idToken).catch(() => undefined)
  }, [platformURL, idToken])

  const fallback = useMemo(() => createBarFallback(user), [user])

  // Contacts has no dedicated TwakeSpace embed: ordinary frames keep the bar.
  if (isLoading) return null

  const sdk = platformURL ? getPlatformSdk(platformURL) : null
  const bar = (
    <TwakeBar
      app={{
        slug: 'contacts',
        name: t('contacts.title'),
        icon: new URL('/contacts.svg', window.location.origin).href,
        textIcon: new URL('/contacts-text.svg', window.location.origin).href
      }}
      onLogOut={handleLogOut}
      fallback={fallback}
    />
  )

  return (
    <div id="cozy-bar" className="u-flex-shrink-0">
      {sdk ? <SdkProvider client={sdk}>{bar}</SdkProvider> : bar}
    </div>
  )
}
