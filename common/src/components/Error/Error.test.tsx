import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { TwakeMuiThemeProvider } from '@linagora/twake-mui'
import I18n from 'twake-i18n'
import { setupStore } from '@common/app/store'
import { UserState } from '@common/features/User/UserSlice'
import en from '@common/locales/en.json'
import { Error } from './Error'

const renderError = (): void => {
  const store = setupStore({
    user: { error: 'Boom' } as UserState
  })
  render(
    <Provider store={store}>
      <TwakeMuiThemeProvider>
        <I18n lang="en" dictRequire={() => en}>
          <Error isCrashFallback />
        </I18n>
      </TwakeMuiThemeProvider>
    </Provider>
  )
}

describe('Error page', () => {
  afterEach(() => {
    delete (window as Partial<Window>).APP_VERSION
  })

  it('shows the version of the build', () => {
    window.APP_VERSION = 'sha-1234abcd'

    renderError()

    expect(screen.getByText('Version sha-1234abcd')).toBeInTheDocument()
  })

  it('shows no version when version.js is not loaded', () => {
    renderError()

    expect(screen.queryByText(/^Version /)).not.toBeInTheDocument()
  })
})
