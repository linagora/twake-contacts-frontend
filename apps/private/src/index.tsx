import '@linagora/twake-css/dist/utils.css'

import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import * as Sentry from '@sentry/react'
import './index.styl'
import App from './App'
import { bootstrap } from './bootstrap'
import { config, configErrors, type Config } from '@common/config'
import { store } from '@common/app/store'
import { initSentry } from '@common/app/sentry'
import { configureAuth } from '@linagora/twake-oidc'

const startApp = (settings: Config): React.ReactNode => {
  initSentry()
  configureAuth({
    ssoUrl: settings.SSO_BASE_URL,
    clientId: settings.SSO_CLIENT_ID,
    scope: settings.SSO_SCOPE,
    redirectUri: settings.SSO_REDIRECT_URI,
    postLogoutRedirectUri: settings.SSO_POST_LOGOUT_REDIRECT ?? '',
    apiUrl: settings.SIDE_SERVICE_BASE_URL
  })
  return (
    <React.StrictMode>
      <Sentry.ErrorBoundary>
        <Provider store={store}>
          <App />
        </Provider>
      </Sentry.ErrorBoundary>
    </React.StrictMode>
  )
}

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

bootstrap(createRoot(container), { config, errors: configErrors }, startApp)
