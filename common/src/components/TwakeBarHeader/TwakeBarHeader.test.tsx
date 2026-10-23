import { act, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { setupStore } from '@common/app/store'
import { setAppLoading } from '@common/app/loadingSlice'
import { TwakeBarHeader } from './TwakeBarHeader'
import { logOut } from '@linagora/twake-oidc'
import { ensureSdkSignedIn, getPlatformSdk } from '@common/utils/sdkSession'
import I18n from 'twake-i18n'
import en from '@common/locales/en.json'

jest.mock('@common/utils/sdkSession', () => ({
  ensureSdkSignedIn: jest.fn(() => Promise.resolve({})),
  getPlatformSdk: jest.fn(() => ({}))
}))
jest.mock('@linagora/twake-oidc', () => ({ logOut: jest.fn() }))

const mockBar = jest.fn()
jest.mock('@linagora/twake-bar', () => ({
  SdkProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sdk-provider">{children}</div>
  ),
  TwakeBar: (props: { onLogOut: () => void }) => {
    mockBar(props)
    return <button onClick={props.onLogOut}>Logout</button>
  }
}))

const renderBar = (
  options: {
    loading?: boolean
    workplace?: string
    token?: string
    signedIn?: boolean
  } = {}
) => {
  const store = setupStore()
  const state = store.getState()
  const testStore = setupStore({
    ...state,
    loading: { isLoading: options.loading ?? false },
    user: {
      ...state.user,
      loading: options.signedIn === false,
      userData: {
        email: options.signedIn === false ? '' : 'alice@example.com',
        name: 'Alice Doe',
        given_name: 'Alice',
        family_name: 'Doe',
        sub: 'alice',
        sid: 'sid',
        workplaceFqdn: options.workplace
      },
      tokens: options.token ? { id_token: options.token } : null
    }
  })
  return {
    store: testStore,
    ...render(
      <Provider store={testStore}>
        <I18n dictRequire={() => en} lang="en">
          <TwakeBarHeader />
        </I18n>
      </Provider>
    )
  }
}

describe('TwakeBarHeader', () => {
  beforeEach(() => {
    window.WORKPLACE_FQDN_FALLBACK = undefined
    window.SUPPORT_URL = 'https://support.example.com'
    window.appList = [{ name: 'Mail', link: '/mail', icon: '/mail.svg' }]
    mockBar.mockClear()
  })

  it('shows the bar before sign-in without fallback user details', () => {
    renderBar({ signedIn: false })
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(mockBar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fallback: expect.objectContaining({ user: undefined })
      })
    )
  })

  it('shows the bar after the application loader is dismissed', () => {
    const { store } = renderBar({ loading: true })
    expect(mockBar).not.toHaveBeenCalled()
    act(() => {
      store.dispatch(setAppLoading(false))
    })
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('passes the full display name, configured apps and help, and logs out', () => {
    renderBar()
    expect(mockBar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        app: {
          slug: 'contacts',
          name: 'Contacts',
          icon: 'http://localhost/contacts.svg',
          textIcon: 'http://localhost/contacts-text.svg'
        },
        fallback: {
          helpLink: 'https://support.example.com',
          apps: [{ name: 'Mail', href: '/mail', icon: '/mail.svg' }],
          user: { name: 'Alice Doe', email: 'alice@example.com' }
        }
      })
    )
    expect(screen.queryByTestId('sdk-provider')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(logOut).toHaveBeenCalledTimes(1)
  })

  it('signs into the workplace and supplies the shared SDK client', () => {
    renderBar({ workplace: 'alice.twake.app', token: 'id-token' })
    expect(ensureSdkSignedIn).toHaveBeenCalledWith(
      'https://alice.twake.app',
      'id-token'
    )
    expect(getPlatformSdk).toHaveBeenCalledWith('https://alice.twake.app')
    expect(screen.getByTestId('sdk-provider')).toBeInTheDocument()
  })

  it('resolves the workplace fallback and tolerates a refused token exchange', async () => {
    window.WORKPLACE_FQDN_FALLBACK = '{localpart}.twake.app'
    jest.mocked(ensureSdkSignedIn).mockRejectedValueOnce(new Error('refused'))
    await act(async () => {
      renderBar({ token: 'id-token' })
    })
    expect(ensureSdkSignedIn).toHaveBeenCalledWith(
      'https://alice.twake.app',
      'id-token'
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('supplies the platform client even before a token is available', () => {
    window.appList = undefined
    window.SUPPORT_URL = undefined
    renderBar({ workplace: 'alice.twake.app' })
    expect(ensureSdkSignedIn).not.toHaveBeenCalled()
    expect(getPlatformSdk).toHaveBeenCalledWith('https://alice.twake.app')
    expect(screen.getByTestId('sdk-provider')).toBeInTheDocument()
    expect(mockBar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fallback: expect.objectContaining({ apps: [], helpLink: undefined })
      })
    )
  })
})
