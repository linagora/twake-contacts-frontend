import { config } from '@common/config'
import { useAppSelector } from '@common/app/hooks'
import type { RootState } from '@common/app/store'
import { Error as ErrorPage } from '@common/components/Error/Error'
import { Loading } from '@common/components/Loading/Loading'
import { TwakeBarHeader } from '@common/components/TwakeBarHeader/TwakeBarHeader'
import { highContrastThemeOptions } from '@common/features/Settings/highContrastTheme'
import { useInitializeApp } from '@common/features/User/useInitializeApp'
import {
  Box,
  Stack,
  TwakeMuiThemeProvider,
  useColorScheme
} from '@linagora/twake-mui'
import * as Sentry from '@sentry/react'
import { Suspense, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BrowserRouter as Router } from 'react-router'

import I18n from 'twake-i18n'
import { WebSocketGate } from '@common/websocket/WebSocketGate'
import { AppRoutes } from './AppRoutes'
import { dateLocales, isValidLanguage, locale } from './i18n'

const selectIsHighContrast = (state: RootState): boolean =>
  state.settings.contrastMode === 'more'

/** The high-contrast scheme is light: it wins over the dark theme. */
function ThemeSync(): null {
  const { mode, setMode } = useColorScheme()
  const themeMode = useAppSelector(state => state.settings.themeMode)
  const isHighContrast = useAppSelector(selectIsHighContrast)
  const effectiveMode = isHighContrast ? 'light' : themeMode

  useEffect(() => {
    if (mode !== effectiveMode) {
      setMode(effectiveMode)
    }
  }, [mode, effectiveMode, setMode])

  return null
}

export default function App(): React.JSX.Element {
  const appLoading = useAppSelector(state => state.loading.isLoading)
  const userLanguage = useAppSelector(state => state.user.coreConfig.language)
  const settingsLanguage = useAppSelector(state => state.settings.language)
  const isHighContrast = useAppSelector(selectIsHighContrast)
  const savedLang = localStorage.getItem('lang')
  const defaultLang = config.LANG

  const lang =
    [userLanguage, settingsLanguage, savedLang, defaultLang].find(
      l => !!l && isValidLanguage(l)
    ) || 'en'

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  useInitializeApp()

  return (
    <TwakeMuiThemeProvider
      themeOptions={isHighContrast ? highContrastThemeOptions : undefined}
    >
      <ThemeSync />
      <I18n
        dictRequire={(lang: keyof typeof locale) => locale[lang]}
        lang={lang}
        locales={dateLocales}
      >
        <Stack className="u-h-100">
          <ErrorBoundary
            FallbackComponent={({ error }) => (
              <ErrorPage
                isCrashFallback
                errorBoundaryMessage={error as Error}
              />
            )}
            onError={(error, errorInfo) => {
              Sentry.captureException(error, {
                contexts: {
                  react: {
                    componentStack: errorInfo.componentStack
                  }
                }
              })
            }}
          >
            <TwakeBarHeader />
            <Box className="u-flex-auto u-ov-hidden">
              <Suspense fallback={<Loading />}>
                <WebSocketGate />
                <Router>
                  <AppRoutes />
                </Router>
              </Suspense>
              {appLoading && <Loading />}
            </Box>
          </ErrorBoundary>
        </Stack>
      </I18n>
    </TwakeMuiThemeProvider>
  )
}
