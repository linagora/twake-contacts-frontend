import { useAppSelector } from '@common/app/hooks'
import { Error as ErrorPage } from '@common/components/Error/Error'
import { Loading } from '@common/components/Loading/Loading'
import { EmbeddingProvider } from '@common/contexts/EmbeddingContext'
import { AVAILABLE_LANGUAGES } from '@common/features/Settings/constants'
import { useInitializeApp } from '@common/features/User/useInitializeApp'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import * as Sentry from '@sentry/react'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BrowserRouter as Router } from 'react-router'

import {
  de as deLocale,
  enGB,
  es as esLocale,
  fr as frLocale,
  it as itLocale,
  ru as ruLocale,
  vi as viLocale
} from 'date-fns/locale'

import de from '@common/locales/de.json'
import en from '@common/locales/en.json'
import es from '@common/locales/es.json'
import fr from '@common/locales/fr.json'
import it from '@common/locales/it.json'
import ru from '@common/locales/ru.json'
import vi from '@common/locales/vi.json'
import I18n from 'twake-i18n'
import { WebSocketGate } from '@common/websocket/WebSocketGate'
import { AppRoutes } from './AppRoutes'

const locale = { en, fr, ru, vi, es, de, it }
const dateLocales = {
  en: enGB,
  fr: frLocale,
  ru: ruLocale,
  vi: viLocale,
  es: esLocale,
  de: deLocale,
  it: itLocale
}

const SUPPORTED_LANGUAGES = AVAILABLE_LANGUAGES.map(lang => lang.code)
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const isValidLanguage = (
  lang: string | null | undefined
): lang is SupportedLanguage => {
  return !!lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}

export default function App(): JSX.Element {
  const appLoading = useAppSelector(state => state.loading.isLoading)
  const userLanguage = useAppSelector(state => state.user.coreConfig.language)
  const settingsLanguage = useAppSelector(state => state.settings.language)
  const savedLang = localStorage.getItem('lang')
  const defaultLang = window.LANG

  const lang =
    [userLanguage, settingsLanguage, savedLang, defaultLang].find(
      l => !!l && isValidLanguage(l)
    ) || 'en'

  useInitializeApp()

  return (
    <EmbeddingProvider>
      <TwakeMuiThemeProvider>
        <I18n
          dictRequire={(lang: keyof typeof locale) => locale[lang]}
          lang={lang}
          locales={dateLocales}
        >
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
            <Suspense fallback={<Loading />}>
              <WebSocketGate />
              <Router>
                <AppRoutes />
              </Router>
            </Suspense>
            {appLoading && <Loading />}
          </ErrorBoundary>
        </I18n>
      </TwakeMuiThemeProvider>
    </EmbeddingProvider>
  )
}
